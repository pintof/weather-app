import express from "express";
import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import process from "node:process";
import { buildForecastUrl, normalizeForecast } from "./forecast.js";
import { parseCoordinates, validateCity } from "./validation.js";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const auth0Domain = requiredEnv("AUTH0_DOMAIN")
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");
const auth0BaseUrl = `https://${auth0Domain}`;
const apiAudience = requiredEnv("AUTH0_API_AUDIENCE");
const managementAudience =
  process.env.AUTH0_MANAGEMENT_API_AUDIENCE?.trim() ||
  `${auth0BaseUrl}/api/v2/`;
const managementScopes =
  process.env.AUTH0_MANAGEMENT_API_SCOPES?.trim() ||
  "read:users update:users";
const managementClientId = requiredEnv("AUTH0_MANAGEMENT_CLIENT_ID");
const managementClientSecret = requiredEnv("AUTH0_MANAGEMENT_CLIENT_SECRET");
const port = Number(process.env.PORT || 3001);
const detailedLoggingEnabled = process.env.NODE_ENV === "development";
const issuer = `${auth0BaseUrl}/`;
const jwks = createRemoteJWKSet(
  new URL("/.well-known/jwks.json", `${auth0BaseUrl}/`),
);

let cachedManagementToken;
let managementTokenRequest;

function redactSensitiveData(value) {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveData);
  }
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      /authorization|access_token|refresh_token|id_token|client_secret/i.test(
        key,
      )
        ? "[REDACTED]"
        : redactSensitiveData(entry),
    ]),
  );
}

function logApiExchange({ direction, method, url, status, request, response }) {
  if (!detailedLoggingEnabled) return;

  let safeUrl;
  try {
    const parsedUrl = new URL(url);
    for (const key of parsedUrl.searchParams.keys()) {
      if (/token|secret|authorization|password/i.test(key)) {
        parsedUrl.searchParams.set(key, "[REDACTED]");
      }
    }
    safeUrl = parsedUrl.toString();
  } catch {
    safeUrl = String(url).replace(
      /([?&](?:access_token|refresh_token|token|secret|password)=)[^&]*/gi,
      "$1[REDACTED]",
    );
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      direction,
      method,
      url: safeUrl,
      ...(status === undefined ? {} : { status }),
      ...(request === undefined
        ? {}
        : { request: redactSensitiveData(request) }),
      ...(response === undefined
        ? {}
        : { response: redactSensitiveData(response) }),
    }),
  );
}

async function auth0ResponseError(
  response,
  operation,
  { method, url, request } = {},
) {
  const body = await response.json().catch(() => ({}));
  logApiExchange({
    direction: "outbound",
    method,
    url,
    status: response.status,
    ...(request === undefined ? {} : { request }),
    response: body,
  });
  const code = body.error || body.errorCode || body.code;
  const detail = body.error_description || body.message;
  const reason = [
    `Auth0 ${operation} failed (HTTP ${response.status}`,
    code ? `, ${String(code).slice(0, 80)}` : "",
    ")",
    typeof detail === "string" ? `: ${detail.slice(0, 300)}` : "",
  ].join("");

  const error = new Error(reason);
  error.statusCode = response.status;
  return error;
}

async function getManagementToken() {
  if (
    cachedManagementToken &&
    cachedManagementToken.expiresAt > Date.now() + 60_000
  ) {
    return cachedManagementToken.value;
  }

  if (!managementTokenRequest) {
    managementTokenRequest = (async () => {
      const tokenUrl = `${auth0BaseUrl}/oauth/token`;
      const tokenRequest = {
        grant_type: "client_credentials",
        client_id: managementClientId,
        client_secret: managementClientSecret,
        audience: managementAudience,
        scope: managementScopes,
      };
      logApiExchange({
        direction: "outbound",
        method: "POST",
        url: tokenUrl,
        request: tokenRequest,
      });
      let response;
      try {
        response = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokenRequest),
        });
      } catch (error) {
        logApiExchange({
          direction: "outbound",
          method: "POST",
          url: tokenUrl,
          request: tokenRequest,
          response: { error: error.message },
        });
        throw error;
      }

      if (!response.ok) {
        throw await auth0ResponseError(
          response,
          "Management API token request",
          { method: "POST", url: tokenUrl, request: tokenRequest },
        );
      }

      const token = await response.json();
      logApiExchange({
        direction: "outbound",
        method: "POST",
        url: tokenUrl,
        status: response.status,
        response: token,
      });
      if (
        typeof token.access_token !== "string" ||
        !Number.isFinite(token.expires_in)
      ) {
        throw new Error("Auth0 returned an invalid Management API token.");
      }

      cachedManagementToken = {
        value: token.access_token,
        expiresAt: Date.now() + token.expires_in * 1000,
      };
      return cachedManagementToken.value;
    })().finally(() => {
      managementTokenRequest = undefined;
    });
  }

  return managementTokenRequest;
}

async function managementRequest(path, method = "GET", body) {
  const token = await getManagementToken();
  const url = `${auth0BaseUrl}/api/v2${path}`;
  logApiExchange({
    direction: "outbound",
    method,
    url,
    ...(body ? { request: body } : {}),
  });
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    logApiExchange({
      direction: "outbound",
      method,
      url,
      ...(body ? { request: body } : {}),
      response: { error: error.message },
    });
    throw error;
  }

  if (!response.ok) {
    throw await auth0ResponseError(response, "Management API request", {
      method,
      url,
      request: body,
    });
  }

  const responseBody = response.status === 204 ? null : await response.json();
  logApiExchange({
    direction: "outbound",
    method,
    url,
    status: response.status,
    response: responseBody,
  });
  return responseBody;
}

async function authenticate(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: "A bearer access token is required." });
    return undefined;
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(match[1], jwks, {
      issuer,
      audience: apiAudience,
    }));
  } catch (verificationError) {
    if (
      verificationError instanceof errors.JWKSTimeout ||
      verificationError instanceof errors.JWKSInvalid ||
      !(verificationError instanceof errors.JOSEError)
    ) {
      next(verificationError);
      return undefined;
    }

    res.status(401).json({ error: "The access token is invalid or expired." });
    return undefined;
  }

  if (typeof payload.sub !== "string" || !payload.sub) {
    res.status(401).json({ error: "The access token has no user subject." });
    return undefined;
  }

  req.auth0Sub = payload.sub;
  next();
}

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  const queryIndex = req.url.indexOf("?");
  const requestUrl = `${req.path}${queryIndex === -1 ? "" : req.url.slice(queryIndex)}`;
  req.apiLogUrl = requestUrl;
  logApiExchange({
    direction: "inbound",
    method: req.method,
    url: requestUrl,
  });

  const sendJson = res.json.bind(res);
  res.json = (body) => {
    logApiExchange({
      direction: "inbound",
      method: req.method,
      url: requestUrl,
      status: res.statusCode,
      response: body,
    });
    return sendJson(body);
  };
  next();
});
app.use(express.json({ limit: "16kb" }));
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
    logApiExchange({
      direction: "inbound",
      method: req.method,
      url: req.apiLogUrl,
      request: req.body,
    });
  }
  next();
});
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api", authenticate);

app.get("/api/me", async (req, res) => {
  const profile = await managementRequest(
    `/users/${encodeURIComponent(req.auth0Sub)}?fields=user_metadata&include_fields=true`,
  );
  const metadata = profile.user_metadata || {};

  res.json({
    user_metadata: {
      ...(typeof metadata.city === "string" ? { city: metadata.city } : {}),
      ...(metadata.city_location
        ? { city_location: metadata.city_location }
        : {}),
    },
  });
});

app.patch("/api/me/city", async (req, res) => {
  let city;
  try {
    city = validateCity(req.body?.city);
  } catch (validationError) {
    res.status(400).json({ error: validationError.message });
    return;
  }

  await managementRequest(
    `/users/${encodeURIComponent(req.auth0Sub)}`,
    "PATCH",
    {
      user_metadata: {
        city: [city.name, city.admin1].filter(Boolean).join(", "),
        city_location: city,
      },
    },
  );

  res.json({ city });
});

app.get("/api/forecast", async (req, res) => {
  let coordinates;
  try {
    coordinates = parseCoordinates(req.query);
  } catch (validationError) {
    res.status(400).json({ error: validationError.message });
    return;
  }

  const forecastUrl = buildForecastUrl(coordinates);

  try {
    logApiExchange({
      direction: "outbound",
      method: "GET",
      url: forecastUrl.toString(),
    });
    let response;
    try {
      response = await fetch(forecastUrl, {
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      logApiExchange({
        direction: "outbound",
        method: "GET",
        url: forecastUrl.toString(),
        response: { error: error.message },
      });
      throw error;
    }
    if (!response.ok) {
      logApiExchange({
        direction: "outbound",
        method: "GET",
        url: forecastUrl.toString(),
        status: response.status,
        response: await response.json().catch(() => null),
      });
      console.error(`Open-Meteo forecast request failed (HTTP ${response.status}).`);
      res.status(502).json({
        error: "Weather service is unavailable. Please try again.",
      });
      return;
    }

    const data = await response.json();
    logApiExchange({
      direction: "outbound",
      method: "GET",
      url: forecastUrl.toString(),
      status: response.status,
      response: data,
    });
    res.json(normalizeForecast(data));
  } catch (error) {
    console.error("Open-Meteo forecast request failed:", error.message);
    res.status(502).json({
      error: "Weather service is unavailable. Please try again.",
    });
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error.status === 400) {
    res.status(400).json({ error: "The request body is invalid." });
    return;
  }
  if (error.status === 413) {
    res.status(413).json({ error: "The request body is too large." });
    return;
  }
  console.error(`API request failed for ${req.path}:`, error.message);
  res.status(502).json({ error: "The server could not complete the request." });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Weather API listening on http://127.0.0.1:${port}`);
});
