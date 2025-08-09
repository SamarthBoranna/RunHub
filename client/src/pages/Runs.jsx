import ActivitiesCard from "../components/ActivitiesCard";
import WeeklyMetrics from "../components/WeeklyMetrics";

export default function Runs() {
  return (
    <div className="px-6">
      <div className="flex gap-6">
        <div className="w-1/2">
          <ActivitiesCard />
        </div>
        <div className="w-1/2">
          <WeeklyMetrics />
        </div>
      </div>
    </div>
  );
}
