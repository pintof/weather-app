# Weather App
<img width="1830" height="980" alt="image" src="https://github.com/user-attachments/assets/a32a9fa7-a1d2-48a2-9c05-3d25f78c6943" />


## Run locally

1. Extract `.env` from `.env.zip` into the root folder. Password is CTO's last name.
2. Install dependencies with `npm install`.
3. Run `npm run dev` to start both FrontEnd Vite and BackEnd Express together.

`dev:frontend` starts only Vite. `dev:backend` starts only the Express server. In dev mode it watches the server files and restarts Express when they change, also logs out API calls to the terminal.
`prod:backend` runs Express without watch/restart behavior & without API call logging to terminal, for production use.

## Architecture

```text
Browser (React + Auth0 SPA)
  ├─ Auth0 login ───────────────────────────────> Auth0 tenant
  ├─ City search ───────────────────────────────> Open-Meteo Geocoding API
  └─ /api requests with Weather API access token
       └─ Vite dev proxy (/api) ────────────────> Express backend
            ├─ verifies token (issuer, audience, signature, expiry) with Auth0 JWKS
            ├─ reads/updates signed-in user's city using a server-side M2M token
            │    └──────────────────────────────> Auth0 Management API
            └─ retrieves five-day forecast
                 └──────────────────────────────> Open-Meteo Forecast API
```

The React app in `src/` handles Auth0 login, city autocomplete, and forecast
display. City suggestions use Open-Meteo's Geocoding API directly from the
browser. After selection, the city is saved to Auth0 `user_metadata` through
Express. The frontend obtains a currently active user's access token for the custom 
Weather API and sends it as `Authorization: Bearer <token>` on backend requests. Express
validates the token and uses its verified `sub` as the user identity; it never
accepts a user ID from the browser.

The backend in `server/` uses a separate Machine-to-Machine client to obtain a
Management API token. The M2M secret and Management API token remain server
side. The Vite proxy forwards local `/api` requests from the frontend port
(normally `5173`) to Express on port `3001`; in production, configure a
same-origin reverse proxy or equivalent routing.

### Backend endpoints

All endpoints below require a valid Weather API access token in the
`Authorization` header.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/me` | Loads the signed-in user's saved `user_metadata.city` and `user_metadata.city_location` from Auth0. The user ID comes from the verified token. |
| `PATCH` | `/api/me/city` | Saves the selected city to the signed-in user's Auth0 metadata. Request JSON: `{"city":{"name":"Oakville","admin1":"Ontario","country":"Canada","countryCode":"CA","latitude":43.45,"longitude":-79.68,"timezone":"America/Toronto"}}`. The server validates the supported fields and coordinates. |
| `GET` | `/api/forecast?latitude=<lat>&longitude=<lon>` | Validates coordinates, requests five daily forecasts from Open-Meteo in Celsius, and returns dates, weather codes, highs, lows, and precipitation probabilities. Selecting a city loads it; the Refresh button calls the endpoint again. |

## Tests

Run `npm test` to execute the Node.js test suite. It covers city normalization
and ranking, weather-condition/date formatting, backend input validation, and
five-day forecast URL/response handling. The tests use Node's built-in test
runner and do not require additional test dependencies.

Vite proxies `/api` requests to the Express server on port 3001. The API also
validates Auth0 access tokens, derives the currently active user ID from the verified token,
and only reads or updates that user's city metadata into the Auth0 server.
For production, serve the frontend and API on the same origin or configure a
reverse proxy to forward `/api` requests to Express.

## Five-day forecast

After a city is selected, the frontend requests `/api/forecast` with that
city's coordinates. Express validates the coordinates and fetches a five-day
daily forecast from Open-Meteo, returning weather conditions, high and low
temperatures in Celsius, and precipitation probability. Use the Refresh
button to request updated forecast data. The browser does not call the
forecast API directly, but routes it through the backend.
