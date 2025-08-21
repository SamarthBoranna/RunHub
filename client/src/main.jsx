import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { HeroUIProvider } from "@heroui/react";
import App from "./App";
import "./index.css";
import { ActivitiesProvider } from "./components/ActivitiesContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <HeroUIProvider>
        <ActivitiesProvider>
          <main>
            <App />
          </main>
        </ActivitiesProvider>
      </HeroUIProvider>
    </Router>
  </React.StrictMode>
);
