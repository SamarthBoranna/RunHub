import { Pagination, Button, Link } from "@heroui/react";
import { useEffect, useState } from "react";

function ActivitiesCard() {
  const [activities, setActivities] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Assume true by default
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetch("http://localhost:5050/api/recentActivities", {
      credentials: "include",
    })
      .then((res) => {
        // Not logged in
        if (res.status === 401) {
          setIsLoggedIn(false);
          return [];
        }
        return res.json();
      })
      .then((data) => {
        // Logged in but not authorized (data = {error})
        if (Array.isArray(data)) {
          setActivities(data);
        } 
        else {
          setActivities([]);
          setIsLoggedIn(false);
        }
      })
      .catch(() => {
        setActivities([]);
        setIsLoggedIn(false);
      });
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Recent Runs</h1>
        <p className="text-gray-500">Login to see your activities</p>
        <Button as={Link} color="primary" href="http://localhost:5050/authorize" variant="flat">
            Authorize
        </Button>
      </div>
    );
  }

  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const paginatedRuns = activities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Recent Runs</h1>
      <div className="space-y-4 mb-8">
        {paginatedRuns.map((run) => (
          <div
            key={run.id}
            className="border p-4 rounded-lg shadow flex justify-between items-center"
          >
            <div>
              <p className="text-lg font-medium">{run.name}</p>
              <p className="text-sm text-gray-500">
                {new Date(run.start_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-6 text-right">
              <div>
                <p className="font-semibold">
                  {(run.distance / 1609).toFixed(2)} mi
                </p>
                <p className="text-xs text-gray-500">Distance</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        page={currentPage}
        total={totalPages}
        onChange={(newPage) => setCurrentPage(newPage)}
        showControls
        isCompact
      />
    </div>
  );
}

export default ActivitiesCard;
