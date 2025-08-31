import { useState, useEffect } from "react";
import {
  Avatar,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
} from "@heroui/react";
import { useActivities } from "./ActivitiesContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function BadgesCard() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useActivities();

  useEffect(() => {
    async function fetchBadges() {
      console.log("Fetching badges for user ID:", userId);
      if (!userId) return;

      try {
        const response = await fetch(`${API_BASE}/api/badges/${userId}`);
        if (response.ok) {
          const data = await response.json();
          // console.log("Fetched badges:", data);
          setBadges(data);
        } else {
          console.error("Failed to fetch badges");
        }
      } catch (error) {
        console.error("Error fetching badges:", error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchBadges();
    } else {
      setLoading(false);
    }
  }, [userId]);

  if (!userId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl mb-6">Your Achievement Badges</h1>
        <p className="text-gray-500 mb-4">
          You must authorize Strava to access your activities.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl mb-6">Your Achievement Badges</h1>
        <div>Loading... </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl">Your Achievement Badges</h2>
        {badges.length} {badges.length === 1 ? "Badge" : "Badges"} Earned
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {badges.map((badge) => (
          <Card key={badge.id} className="max-w-[300px]">
            <CardHeader className="flex gap-3 justify-center py-4">
              <Avatar
                isBordered
                color="default"
                className="w-20 h-20 text-large"
                src={`/assets/${badge.icon}`}
                name={badge.name}
              />
            </CardHeader>
            <CardBody className="text-center">
              <p className="text-md font-bold">{badge.name}</p>
              <p className="text-sm text-gray-600">{badge.description}</p>
            </CardBody>
            <Divider />
            <CardFooter className="text-center flex justify-center items-center text-xs text-gray-500">
              <p>
                {new Date(badge.earned_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
