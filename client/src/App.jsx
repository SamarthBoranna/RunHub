import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Runs from "./pages/Runs";
import Badges from "./pages/Badges";
import Heatmap from "./pages/Heatmap";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Dashboard className="w-auto px-6" />
        <main className="flex-1 container mx-auto">
          <div>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/badges" element={<Badges />} />
              <Route path="/heatmap" element={<Heatmap />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
