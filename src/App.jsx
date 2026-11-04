import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { MapPin } from "lucide-react";
import { auth0ApiAudience } from "@/auth0-config";
import { CityPicker } from "@/components/weather/CityPicker";
import { ForecastPanel } from "@/components/weather/ForecastPanel";
import { LoginCard } from "@/components/weather/LoginCard";
import { UserHeader } from "@/components/weather/UserHeader";
import { WeatherIllustration } from "@/components/weather/WeatherIllustration";
import {
  cityLabel,
  isSavedCity,
  normalizeGeocodingResult,
  rankCities,
} from "@/lib/weather";

async function requestCityLookup(name, signal) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name,
    count: "10",
    language: "en",
    format: "json",
  }).toString();

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error("City search is temporarily unavailable.");
  }

  const data = await response.json();
  return (data.results || []).map(normalizeGeocodingResult);
}

async function resolveSavedCity(profile) {
  const metadata = profile.user_metadata || {};
  if (isSavedCity(metadata.city_location)) return metadata.city_location;
  if (typeof metadata.city !== "string" || !metadata.city.trim()) return null;

  const cities = await requestCityLookup(metadata.city);
  const savedName = metadata.city.split(",")[0].trim().toLowerCase();
  return (
    cities.find((city) => city.name.toLowerCase() === savedName) ||
    rankCities(cities, savedName)[0] ||
    null
  );
}

function App() {
  const {
    isLoading: isAuthLoading,
    isAuthenticated,
    error: authError,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    user,
  } = useAuth0();

  const [selectedCity, setSelectedCity] = useState(null);
  const [savedCityLabel, setSavedCityLabel] = useState("");
  const [isLoadingSavedCity, setIsLoadingSavedCity] = useState(true);
  const [isSavingCity, setIsSavingCity] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [forecastRefresh, setForecastRefresh] = useState(0);
  const inputRef = useRef(null);

  const requestApi = useCallback(
    async (path, { method = "GET", body, signal } = {}) => {
      if (!auth0ApiAudience) {
        throw new Error(
          "Set VITE_AUTH0_API_AUDIENCE to your Auth0 Weather API identifier.",
        );
      }

      const token = await getAccessTokenSilently({
        authorizationParams: { audience: auth0ApiAudience },
      });
      const response = await fetch(path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        ...(signal ? { signal } : {}),
      });

      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          responseBody.error ||
            `The server could not complete the request (${response.status}).`,
        );
      }
      return responseBody;
    },
    [getAccessTokenSilently],
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return undefined;

    let active = true;
    async function loadSavedCity() {
      try {
        const profile = await requestApi("/api/me");
        const city = await resolveSavedCity(profile);
        if (!active || !city) return;
        setSelectedCity(city);
        setQuery(cityLabel(city));
        setSavedCityLabel(cityLabel(city));
      } catch (requestError) {
        if (active) {
          setSaveError(
            requestError.message || "Could not load your saved city.",
          );
        }
      } finally {
        if (active) setIsLoadingSavedCity(false);
      }
    }

    void loadSavedCity();
    return () => {
      active = false;
    };
  }, [isAuthenticated, requestApi, user?.sub]);

  useEffect(() => {
    const searchTerm = query.trim();
    if (!isAuthenticated || selectedCity || searchTerm.length < 2) {
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const cities = await requestCityLookup(searchTerm, controller.signal);
        if (controller.signal.aborted) return;
        setResults(rankCities(cities, searchTerm));
        setActiveIndex(-1);
        setIsSuggestionsOpen(true);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setSearchError(
            requestError.message || "Could not load city suggestions.",
          );
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isAuthenticated, query, selectedCity]);

  const forecastLatitude = selectedCity?.latitude;
  const forecastLongitude = selectedCity?.longitude;

  useEffect(() => {
    if (
      !Number.isFinite(forecastLatitude) ||
      !Number.isFinite(forecastLongitude)
    ) {
      return undefined;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(forecastLatitude),
      longitude: String(forecastLongitude),
    });

    async function loadForecast() {
      setIsLoadingForecast(true);
      setForecastError("");
      try {
        const data = await requestApi(`/api/forecast?${params}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setForecast(data);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setForecastError(
            requestError.message || "Could not load the weather forecast.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingForecast(false);
      }
    }

    void loadForecast();
    return () => controller.abort();
  }, [
    forecastLatitude,
    forecastLongitude,
    forecastRefresh,
    requestApi,
  ]);

  async function saveCity(city) {
    setIsSavingCity(true);
    setSaveError("");
    try {
      await requestApi("/api/me/city", {
        method: "PATCH",
        body: { city },
      });
      setSavedCityLabel(cityLabel(city));
    } catch (requestError) {
      setSaveError(requestError.message || "Could not save your city.");
    } finally {
      setIsSavingCity(false);
    }
  }

  function chooseCity(city) {
    setSelectedCity(city);
    setQuery(cityLabel(city));
    setForecast(null);
    setForecastError("");
    setIsLoadingForecast(false);
    setIsSearching(false);
    setResults([]);
    setIsSuggestionsOpen(false);
    setActiveIndex(-1);
    setSearchError("");
    setSaveError("");
    void saveCity(city);
  }

  function clearCity() {
    setSelectedCity(null);
    setSavedCityLabel("");
    setForecast(null);
    setForecastError("");
    setIsLoadingForecast(false);
    setIsSearching(false);
    setQuery("");
    setResults([]);
    setIsSuggestionsOpen(false);
    setSaveError("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleQueryChange(value) {
    setQuery(value);
    setSelectedCity(null);
    setForecast(null);
    setForecastError("");
    setIsLoadingForecast(false);
    setIsSearching(false);
    setResults([]);
    setActiveIndex(-1);
    setSearchError("");
    setIsSuggestionsOpen(true);
  }

  function handleInputKeyDown(event) {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setIsSuggestionsOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setIsSuggestionsOpen(true);
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      chooseCity(results[activeIndex]);
    } else if (event.key === "Escape") {
      setIsSuggestionsOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleLogout() {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }

  if (isAuthLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-muted-foreground">
        Checking your session...
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginCard
        error={authError?.message}
        onLogin={() => loginWithRedirect()}
        onSignup={() =>
          loginWithRedirect({
            authorizationParams: { screen_hint: "signup" },
          })
        }
      />
    );
  }

  const displayName = user?.username || user?.nickname || user?.name || "there";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div
        className="pointer-events-none absolute -top-40 -right-36 size-[32rem] rounded-full bg-sky-200/45 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-52 -left-40 size-[34rem] rounded-full bg-amber-100/70 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <UserHeader
          displayName={displayName}
          user={user}
          onLogout={handleLogout}
        />
        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:py-16">
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1.5 text-xs font-medium text-sky-800 shadow-sm">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Welcome, {displayName}
            </div>
            <p className="mb-3 text-xs font-bold tracking-[0.2em] text-sky-700 uppercase">
              First, let's find your forecast
            </p>
            <h1 className="max-w-lg text-4xl leading-[1.08] font-semibold tracking-[-0.055em] text-slate-900 sm:text-5xl">
              Which city should we keep an eye on?
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              Search for a city to get started. We’ll show the city and its
              province or region together so you can choose the right place.
            </p>
            <CityPicker
              query={query}
              selectedCity={selectedCity}
              savedCityLabel={savedCityLabel}
              isLoadingSavedCity={isLoadingSavedCity}
              isSavingCity={isSavingCity}
              saveError={saveError}
              results={results}
              activeIndex={activeIndex}
              isSearching={isSearching}
              searchError={searchError}
              isOpen={isSuggestionsOpen}
              inputRef={inputRef}
              onQueryChange={handleQueryChange}
              onInputFocus={() => {
                if (query.trim().length >= 2) setIsSuggestionsOpen(true);
              }}
              onInputKeyDown={handleInputKeyDown}
              onActiveIndexChange={setActiveIndex}
              onChooseCity={chooseCity}
              onClearCity={clearCity}
            />
            <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={14} aria-hidden="true" />
              You can change your location later.
            </p>
          </div>
          {selectedCity ? (
            <ForecastPanel
              city={selectedCity}
              forecast={forecast}
              isLoading={isLoadingForecast}
              error={forecastError}
              onRefresh={() => setForecastRefresh((count) => count + 1)}
            />
          ) : (
            <WeatherIllustration />
          )}
        </section>
        <footer className="border-t border-slate-200/80 pt-4 text-center text-xs text-slate-400">
          City search powered by Open-Meteo
        </footer>
      </div>
    </main>
  );
}

export default App;
