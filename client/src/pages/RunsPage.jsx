import ActivitiesCard from "../components/ActivitiesCard";
import WeeklyMetrics from "../components/WeeklyMetrics";

export default function RunsPage() {
  return (
    <div className="px-6">
      <div className="flex gap-6">
        <div className="w-2/3">
          <ActivitiesCard />
        </div>
        <div className="w-1/3">
          <WeeklyMetrics />
        </div>
      </div>
    </div>
  );
}
