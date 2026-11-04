import assert from "node:assert/strict";
import test from "node:test";
import { forecastDayLabel, weatherCondition } from "../src/lib/weather.js";

test("weatherCondition maps representative WMO codes", () => {
  assert.equal(weatherCondition(0).label, "Clear sky");
  assert.equal(weatherCondition(2).label, "Partly cloudy");
  assert.equal(weatherCondition(45).label, "Fog");
  assert.equal(weatherCondition(55).label, "Drizzle");
  assert.equal(weatherCondition(63).label, "Rain");
  assert.equal(weatherCondition(75).label, "Snow");
  assert.equal(weatherCondition(95).label, "Thunderstorm");
});

test("weatherCondition provides a fallback for unknown codes", () => {
  assert.equal(weatherCondition(999).label, "Mixed conditions");
});

test("forecastDayLabel labels the first day as today", () => {
  assert.equal(forecastDayLabel("2026-11-04", 0), "Today");
});

test("forecastDayLabel formats later dates consistently in UTC", () => {
  assert.equal(forecastDayLabel("2026-11-05", 1), "Thu, Nov 5");
});
