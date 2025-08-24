import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useActivities } from "./components/ActivitiesContext";
import HomePage from "./pages/HomePage";
import RunsPage from "./pages/RunsPage";
import BadgesPage from "./pages/BadgesPage";
import HeatmapPage from "./pages/HeatmapPage";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";

function App() {
  const { setAuthStatus } = useActivities();

  useEffect(() => {
    // Check localStorage on component mount
    const userId = localStorage.getItem("runhub_user_id");

    if (userId) {
      setAuthStatus(true);
    }
  }, [setAuthStatus]);

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main
        className="flex-1 w-full"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233b82f6' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundSize: "6px 6px",
          backgroundColor: "white",
        }}
      >
        <div className="container mx-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/heatmap" element={<HeatmapPage />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
