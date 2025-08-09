import { Pagination, Button, Link, Card, CardBody } from "@heroui/react";
import { useEffect, useState } from "react";
import { useActivities } from "./ActivitiesContext";

// Helper function to calculate pace
const calculatePace = (distance, time) => {
  const miles = distance / 1609;
  const minutesPerMile = time / 60 / miles; // Convert seconds to minutes and divide by miles
  const minutes = Math.floor(minutesPerMile);
  const seconds = Math.round((minutesPerMile - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`; // Format as MM:SS
};

function ActivitiesCard() {
  const { activities, isAuthorized, fetchActivities } = useActivities();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
        <h1 className="text-2xl mb-6">Recent Runs</h1>
        <div>Loading... </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl mb-6">Recent Runs</h1>
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
        <h1 className="text-2xl">Recent Runs</h1>
        <Button color="primary" variant="flat" onClick={fetchActivities}>
          Refresh
        </Button>
      </div>
      <div className="space-y-4 mb-4">
        {paginatedRuns.map((run) => (
          <Card key={run.id} className="w-full">
            <CardBody className="flex flex-col gap-4">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-medium truncate">{run.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(run.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-6 text-right shrink-0">
                  <div>
                    <p className="font-semibold">
                      {(run.distance / 1609).toFixed(2)} mi
                    </p>
                    <p className="text-xs text-gray-500">Distance</p>
                  </div>
                  <div>
                    <p className="font-semibold">
                      {calculatePace(run.distance, run.moving_time)} /mi
                    </p>
                    <p className="text-xs text-gray-500">Pace</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Pagination
        className="flex justify-start"
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
