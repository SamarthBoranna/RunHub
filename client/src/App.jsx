import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RunsPage from "./pages/RunsPage";
import BadgesPage from "./pages/BadgesPage";
import HeatmapPage from "./pages/HeatmapPage";
import NavBar from "./components/NavBar";

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
