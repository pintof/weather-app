import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";

export function cityLabel(city) {
  return [city.name, city.admin1].filter(Boolean).join(", ");
}

export function cityDetails(city) {
  return [city.admin1, city.country]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(", ");
}

export function rankCities(cities, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return cities
    .map((city, index) => {
      const name = city.name.toLocaleLowerCase();
      const region = (city.admin1 || "").toLocaleLowerCase();
      let score = index;

      if (name === normalizedQuery) score -= 100;
      else if (name.startsWith(normalizedQuery)) score -= 50;
      else if (name.includes(normalizedQuery)) score -= 25;
      else if (region.startsWith(normalizedQuery)) score -= 10;
      else if (region.includes(normalizedQuery)) score -= 5;

      return { city, score, index };
    })
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ city }) => city);
}

export function normalizeGeocodingResult(city) {
  return {
    id: city.id,
    name: city.name,
    admin1: city.admin1 || "",
    country: city.country || "",
    countryCode: city.country_code || "",
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone || "",
  };
}

export function isSavedCity(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude)
  );
}

export function weatherCondition(code) {
  if (code === 0) return { label: "Clear sky", Icon: Sun };
  if (code === 1 || code === 2) {
    return { label: "Partly cloudy", Icon: CloudSun };
  }
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if (code === 45 || code === 48) {
    return { label: "Fog", Icon: CloudFog };
  }
  if ([51, 53, 55, 56, 57].includes(code)) {
    return { label: "Drizzle", Icon: CloudDrizzle };
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: "Rain", Icon: CloudRain };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { label: "Snow", Icon: CloudSnow };
  }
  if ([95, 96, 99].includes(code)) {
    return { label: "Thunderstorm", Icon: CloudLightning };
  }
  return { label: "Mixed conditions", Icon: CloudSun };
}

export function forecastDayLabel(date, index) {
  if (index === 0) return "Today";
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
