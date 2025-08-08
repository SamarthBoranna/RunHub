import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Runs from "./pages/Runs";
import Badges from "./pages/Badges";
import Heatmap from "./pages/Heatmap";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <Router>
      <Dashboard />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/badges" element={<Badges />} />
          <Route path="/heatmap" element={<Heatmap />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
