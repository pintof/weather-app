import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Auth0Provider } from "@auth0/auth0-react";
import {
  auth0ApiAudience,
  auth0ClientId,
  auth0Domain,
} from "./auth0-config.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: auth0ApiAudience,
      }}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
);
