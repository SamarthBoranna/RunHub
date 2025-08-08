import { Pagination, Button, Link } from "@heroui/react";
import { useEffect, useState } from "react";
import { useActivities } from "./ActivitiesContext";

function ActivitiesCard() {
  const { activities, isAuthorized, fetchActivities } = useActivities();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!activities && isAuthorized) {
      fetchActivities();
    }
  }, [isAuthorized, fetchActivities]);

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Recent Runs</h1>
        <p className="text-gray-500 mb-4">
          You must authorize Strava to access your activities.
        </p>
        <Button
          as={Link}
          color="primary"
          href="http://localhost:5050/authorize"
          variant="flat"
        >
          Authorize
        </Button>
      </div>
    );
  }

  if (!activities) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Recent Runs</h1>
        <div className="p-6">Loading...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Recent Runs</h1>
        <p className="text-gray-500">No activities found.</p>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Recent Runs</h1>
        <Button color="primary" variant="flat" onClick={fetchActivities}>
          Refresh
        </Button>
      </div>
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
