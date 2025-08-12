import { Card, CardBody } from "@heroui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useActivities } from "./ActivitiesContext";

function WeeklyMetrics() {
  const { activities, isAuthorized } = useActivities();

  const getWeeklyData = () => {
    if (!activities || activities.length === 0) return [];

    // Get start of current week (Monday)
    const now = new Date();
    // Return current day - 1 for all days (loop around if today is Sunday)
    const daysToSubtract = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const startOfWeek = new Date(now.setDate(now.getDate() - daysToSubtract));
    startOfWeek.setHours(0, 0, 0, 0);

    // Initialize data for each day
    const weekData = [
      { day: "Mon", miles: 0 },
      { day: "Tue", miles: 0 },
      { day: "Wed", miles: 0 },
      { day: "Thu", miles: 0 },
      { day: "Fri", miles: 0 },
      { day: "Sat", miles: 0 },
      { day: "Sun", miles: 0 },
    ];

    // Sum up miles for each day
    activities.forEach((activity) => {
      const activityDate = new Date(activity.start_date);
      if (activityDate >= startOfWeek) {
        const dayIndex = activityDate.getDay();
        weekData[dayIndex].miles += activity.distance / 1609;
      }
    });

    return weekData;
  };

  const weeklyData = getWeeklyData();
  const totalMiles = weeklyData
    .reduce((sum, day) => sum + day.miles, 0)
    .toFixed(2);

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <h1 className="text-2xl mb-6">Weekly Mileage</h1>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl">Weekly Mileage</h1>
      <p className="text-gray-500 mb-4">{totalMiles} miles this week</p>

      <Card>
        {/* Set a fixed height for the chart */}
        <CardBody className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fill: "gray" }} />
              <YAxis tick={{ fill: "gray" }} width={"auto"} />
              <Tooltip
                formatter={(value) => [`${value.toFixed(2)} mi`, "Distance"]}
              />
              <Bar dataKey="miles" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  );
}

export default WeeklyMetrics;
