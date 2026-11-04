# Weather App

## Run locally

1. Extract `.env` from `.env.zip` into the root folder. Password is CTO's last name.
2. Install dependencies with `npm install`.
3. Run `npm run dev` to start both FrontEnd Vite and BackEnd Express together.

`dev:frontend` starts only Vite. `dev:backend` starts only the Express server. In dev mode it watches the server files and restarts Express when they change, also logs out API calls to the terminal.
`prod:backend` runs Express without watch/restart behavior & without API call logging to terminal, for production use.

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
