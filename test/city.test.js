import assert from "node:assert/strict";
import test from "node:test";
import {
  cityDetails,
  cityLabel,
  isSavedCity,
  normalizeGeocodingResult,
  rankCities,
} from "../src/lib/weather.js";

test("cityLabel combines the city and region", () => {
  assert.equal(cityLabel({ name: "Oakville", admin1: "Ontario" }), "Oakville, Ontario");
});

test("cityLabel omits an empty region", () => {
  assert.equal(cityLabel({ name: "Paris", admin1: "" }), "Paris");
});

test("cityDetails deduplicates repeated region and country values", () => {
  assert.equal(
    cityDetails({ admin1: "Ontario", country: "Ontario" }),
    "Ontario",
  );
});

test("rankCities favors exact and prefix matches while keeping stable ties", () => {
  const exactMatch = { name: "Springfield", admin1: "Illinois" };
  const prefixMatch = { name: "Springfield Heights", admin1: "Texas" };
  const regionMatch = { name: "Other", admin1: "Springfield County" };
  const tiedPrefixMatch = { name: "Springfield Bay", admin1: "Maine" };

  assert.deepEqual(
    rankCities(
      [prefixMatch, regionMatch, exactMatch, tiedPrefixMatch],
      " Springfield ",
    ),
    [exactMatch, prefixMatch, tiedPrefixMatch, regionMatch],
  );
});

test("normalizeGeocodingResult maps provider fields to the app city shape", () => {
  assert.deepEqual(
    normalizeGeocodingResult({
      id: 123,
      name: "Oakville",
      admin1: "Ontario",
      country: "Canada",
      country_code: "CA",
      latitude: 43.45,
      longitude: -79.68,
      timezone: "America/Toronto",
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

test("isSavedCity accepts a city with finite coordinates", () => {
  assert.equal(
    isSavedCity({ name: "Oakville", latitude: 43.45, longitude: -79.68 }),
    true,
  );
});

test("isSavedCity rejects missing or invalid coordinates", () => {
  assert.equal(isSavedCity({ name: "Oakville", latitude: 43.45 }), false);
  assert.equal(
    isSavedCity({ name: "Oakville", latitude: "43.45", longitude: -79.68 }),
    false,
  );
  assert.equal(isSavedCity(null), false);
});
