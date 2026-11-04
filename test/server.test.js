import assert from "node:assert/strict";
import test from "node:test";
import { buildForecastUrl, normalizeForecast } from "../server/forecast.js";
import { parseCoordinates, validateCity } from "../server/validation.js";

function openMeteoResponse() {
  return {
    timezone: "America/Toronto",
    daily: {
      time: [
        "2026-11-04",
        "2026-11-05",
        "2026-11-06",
        "2026-11-07",
        "2026-11-08",
      ],
      weather_code: [0, 1, 3, 61, 95],
      temperature_2m_max: [10, 11, 12, 8, 7],
      temperature_2m_min: [2, 3, 4, 1, 0],
      precipitation_probability_max: [0, 10, 20, 80, null],
    },
  };
}

test("validateCity trims and returns only supported city fields", () => {
  assert.deepEqual(
    validateCity({
      id: 123,
      name: "  Oakville ",
      admin1: "Ontario",
      country: "Canada",
      countryCode: "CA",
      latitude: 43.45,
      longitude: -79.68,
      timezone: "America/Toronto",
      unexpected: "ignored",
    }),
    {
      id: 123,
      name: "Oakville",
      admin1: "Ontario",
      country: "Canada",
      countryCode: "CA",
      latitude: 43.45,
      longitude: -79.68,
      timezone: "America/Toronto",
    },
  );
});

test("validateCity rejects missing names and out-of-range coordinates", () => {
  assert.throws(() => validateCity(null), /city selection is required/i);
  assert.throws(
    () => validateCity({ name: " ", latitude: 43, longitude: -79 }),
    /city selection is invalid/i,
  );
  assert.throws(
    () => validateCity({ name: "Test", latitude: 91, longitude: 0 }),
    /city selection is invalid/i,
  );
  assert.throws(
    () =>
      validateCity({
        name: "Test",
        latitude: 0,
        longitude: 0,
        admin1: "x".repeat(101),
      }),
    /Invalid city field: admin1/i,
  );
});

test("parseCoordinates accepts valid geographic bounds", () => {
  assert.deepEqual(
    parseCoordinates({ latitude: "-90", longitude: "180" }),
    { latitude: -90, longitude: 180 },
  );
});

test("parseCoordinates rejects missing, non-numeric, and out-of-range values", () => {
  assert.throws(() => parseCoordinates({ latitude: "", longitude: "0" }));
  assert.throws(() => parseCoordinates({ latitude: "north", longitude: "0" }));
  assert.throws(() => parseCoordinates({ latitude: "0", longitude: "181" }));
});

test("buildForecastUrl requests five daily Celsius forecasts in local time", () => {
  const url = buildForecastUrl({ latitude: 43.45, longitude: -79.68 });
  assert.equal(url.origin + url.pathname, "https://api.open-meteo.com/v1/forecast");
  assert.equal(url.searchParams.get("latitude"), "43.45");
  assert.equal(url.searchParams.get("longitude"), "-79.68");
  assert.equal(url.searchParams.get("forecast_days"), "5");
  assert.equal(url.searchParams.get("temperature_unit"), "celsius");
  assert.equal(url.searchParams.get("timezone"), "auto");
  assert.equal(
    url.searchParams.get("daily"),
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  );
});

test("normalizeForecast maps five provider days to the API response shape", () => {
  assert.deepEqual(normalizeForecast(openMeteoResponse()), {
    timezone: "America/Toronto",
    daily: [
      {
        date: "2026-11-04",
        weatherCode: 0,
        high: 10,
        low: 2,
        precipitationProbability: 0,
      },
      {
        date: "2026-11-05",
        weatherCode: 1,
        high: 11,
        low: 3,
        precipitationProbability: 10,
      },
      {
        date: "2026-11-06",
        weatherCode: 3,
        high: 12,
        low: 4,
        precipitationProbability: 20,
      },
      {
        date: "2026-11-07",
        weatherCode: 61,
        high: 8,
        low: 1,
        precipitationProbability: 80,
      },
      {
        date: "2026-11-08",
        weatherCode: 95,
        high: 7,
        low: 0,
        precipitationProbability: null,
      },
    ],
  });
});

test("normalizeForecast rejects missing days and invalid forecast values", () => {
  const incomplete = openMeteoResponse();
  incomplete.daily.time.pop();
  assert.throws(() => normalizeForecast(incomplete), /incomplete five-day forecast/i);

  const invalid = openMeteoResponse();
  invalid.daily.temperature_2m_max[0] = "warm";
  assert.throws(() => normalizeForecast(invalid), /invalid forecast values/i);
});
