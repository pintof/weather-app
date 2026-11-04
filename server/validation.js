function optionalText(value, field, maxLength = 100) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`Invalid city field: ${field}.`);
  }
  return value;
}

export function validateCity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A city selection is required.");
  }

  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 100 ||
    !Number.isFinite(value.latitude) ||
    value.latitude < -90 ||
    value.latitude > 90 ||
    !Number.isFinite(value.longitude) ||
    value.longitude < -180 ||
    value.longitude > 180
  ) {
    throw new Error("The city selection is invalid.");
  }

  return {
    ...(typeof value.id === "number" || typeof value.id === "string"
      ? { id: value.id }
      : {}),
    name: value.name.trim(),
    admin1: optionalText(value.admin1, "admin1"),
    country: optionalText(value.country, "country"),
    countryCode: optionalText(value.countryCode, "countryCode", 10),
    latitude: value.latitude,
    longitude: value.longitude,
    timezone: optionalText(value.timezone, "timezone", 100),
  };
}

export function parseCoordinates(query) {
  const { latitude, longitude } = query;
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  if (
    typeof latitude !== "string" ||
    !latitude.trim() ||
    typeof longitude !== "string" ||
    !longitude.trim() ||
    !Number.isFinite(parsedLatitude) ||
    parsedLatitude < -90 ||
    parsedLatitude > 90 ||
    !Number.isFinite(parsedLongitude) ||
    parsedLongitude < -180 ||
    parsedLongitude > 180
  ) {
    throw new Error("Valid city coordinates are required.");
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}
