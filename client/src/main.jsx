import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import { ActivitiesProvider } from "./components/ActivitiesContext";
import { HeroUIProvider } from "@heroui/react";
import "./index.css";

// First, check for URL parameters before rendering the app
const checkForAuthParams = () => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("user_id");
  const error = params.get("error");

  if (userId) {
    localStorage.setItem("runhub_user_id", userId);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (error) {
    console.error("Authentication error:", error);
    // Could display an error message here
  }
};

// Run this before any components mount
checkForAuthParams();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <HeroUIProvider>
        <ActivitiesProvider>
          <App />
        </ActivitiesProvider>
      </HeroUIProvider>
    </Router>
  </React.StrictMode>
);
