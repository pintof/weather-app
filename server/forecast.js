export function buildForecastUrl({ latitude, longitude }) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "celsius",
    forecast_days: "5",
    timezone: "auto",
  }).toString();
  return url;
}

export function normalizeForecast(data) {
  const daily = data?.daily;
  const dailyFields = [
    "time",
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
  ];

  if (
    !daily ||
    dailyFields.some(
      (field) => !Array.isArray(daily[field]) || daily[field].length !== 5,
    )
  ) {
    throw new Error("Open-Meteo returned an incomplete five-day forecast.");
  }

  const forecastDays = daily.time.map((date, index) => {
    const weatherCode = daily.weather_code[index];
    const high = daily.temperature_2m_max[index];
    const low = daily.temperature_2m_min[index];
    const precipitationProbability =
      daily.precipitation_probability_max[index];

    if (
      typeof date !== "string" ||
      !Number.isInteger(weatherCode) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      (precipitationProbability !== null &&
        !Number.isFinite(precipitationProbability))
    ) {
      throw new Error("Open-Meteo returned invalid forecast values.");
    }

    return { date, weatherCode, high, low, precipitationProbability };
  });

  return { timezone: data.timezone, daily: forecastDays };
}
