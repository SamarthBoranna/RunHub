import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import "./index.css";
import App from "./App.jsx";
import { ActivitiesProvider } from "./components/ActivitiesContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HeroUIProvider>
      <ActivitiesProvider>
        <main>
          <App />
        </main>
      </ActivitiesProvider>
    </HeroUIProvider>
  </StrictMode>
);
