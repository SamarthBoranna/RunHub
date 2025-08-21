import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "./pages/HomePage";
import RunsPage from "./pages/RunsPage";
import BadgesPage from "./pages/BadgesPage";
import HeatmapPage from "./pages/HeatmapPage";
import NavBar from "./components/NavBar";

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check URL for params
    const params = new URLSearchParams(location.search);
    const userId = params.get("user_id");
    const apiKey = params.get("api_key");

    if (userId && apiKey) {
      // Store in localStorage
      localStorage.setItem("runhub_user_id", userId);
      localStorage.setItem("runhub_api_key", apiKey);

      // Clean up URL
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar className="w-auto px-6" />
      <main className="flex-1 container mx-auto">
        <div>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/heatmap" element={<HeatmapPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
