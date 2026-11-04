import {
  Check,
  ChevronDown,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cityDetails, cityLabel } from "@/lib/weather";

export const CITY_SUGGESTIONS_ID = "city-suggestions";

export function CityPicker({
  query,
  selectedCity,
  savedCityLabel,
  isLoadingSavedCity,
  isSavingCity,
  saveError,
  results,
  activeIndex,
  isSearching,
  searchError,
  isOpen,
  inputRef,
  onQueryChange,
  onInputFocus,
  onInputKeyDown,
  onActiveIndexChange,
  onChooseCity,
  onClearCity,
}) {
  return (
    <Card className="mt-9 gap-0 overflow-visible rounded-2xl border-white/90 bg-white/90 py-0 shadow-xl shadow-slate-300/35 backdrop-blur">
      <CardContent className="p-5 sm:p-6">
        <label
          className="mb-2 block text-sm font-semibold text-slate-800"
          htmlFor="city-search"
        >
          Choose your city
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-slate-400"
            size={18}
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            id="city-search"
            disabled={isLoadingSavedCity || isSavingCity}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen && results.length > 0}
            aria-controls={CITY_SUGGESTIONS_ID}
            aria-activedescendant={
              activeIndex >= 0
                ? `city-option-${results[activeIndex]?.id}`
                : undefined
            }
            autoComplete="off"
            className="h-12 rounded-xl border-slate-200 bg-white pr-12 pl-11 text-sm shadow-sm placeholder:text-slate-400 focus-visible:border-sky-600 focus-visible:ring-sky-600/20"
            placeholder="Start typing a city name..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={onInputFocus}
            onKeyDown={onInputKeyDown}
          />
          {isSearching ? (
            <LoaderCircle
              className="absolute top-1/2 right-3.5 -translate-y-1/2 animate-spin text-sky-700"
              size={18}
              aria-label="Searching cities"
            />
          ) : selectedCity ? (
            <Button
              className="absolute top-1/2 right-1.5 size-9 -translate-y-1/2 rounded-lg text-slate-500"
              variant="ghost"
              size="icon"
              aria-label="Clear selected city"
              disabled={isSavingCity}
              onClick={onClearCity}
            >
              <X size={16} aria-hidden="true" />
            </Button>
          ) : (
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400"
              size={18}
              aria-hidden="true"
            />
          )}

          {isOpen && results.length > 0 && (
            <div
              id={CITY_SUGGESTIONS_ID}
              className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
              role="listbox"
              aria-label="City suggestions"
            >
              {results.map((city, index) => (
                <button
                  id={`city-option-${city.id}`}
                  key={`${city.id}-${city.latitude}-${city.longitude}`}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                    activeIndex === index ? "bg-sky-50" : "hover:bg-slate-50"
                  }`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  disabled={isSavingCity}
                  onMouseEnter={() => onActiveIndexChange(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onChooseCity(city)}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <MapPin size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {city.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {cityDetails(city) || city.countryCode}
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">Select</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-2.5 min-h-5 text-xs text-slate-500" aria-live="polite">
          {isLoadingSavedCity
            ? "Checking your saved city..."
            : isSearching
              ? "Finding the closest matches..."
              : searchError ||
                (query.trim().length === 1
                  ? "Type at least 2 characters to search."
                  : query.trim().length >= 2 && results.length === 0
                    ? "No cities found. Try a different spelling."
                    : "Suggestions include the province or region.")}
        </p>

        {saveError && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {saveError}
          </p>
        )}

        {selectedCity && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Check size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-emerald-800">
                Selected city
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                {selectedCity.name}
              </p>
              <p className="text-xs text-slate-600">
                {cityDetails(selectedCity) || selectedCity.countryCode}
              </p>
              <p
                className="mt-1 text-xs font-medium text-emerald-700"
                aria-live="polite"
              >
                {isSavingCity
                  ? "Saving to your Auth0 profile..."
                  : savedCityLabel === cityLabel(selectedCity)
                    ? "Saved to your Auth0 profile"
                    : "Not saved yet"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
