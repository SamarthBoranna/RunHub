import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, Avatar } from "@heroui/react";
import { useActivities } from "./ActivitiesContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function BadgesPreview() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useActivities();

  useEffect(() => {
    async function fetchBadges() {
      if (!userId) return;

      try {
        const response = await fetch(`${API_BASE}/api/badges/${userId}`);
        if (response.ok) {
          const data = await response.json();
          // Sort by earned_date descending and take the most recent 4
          const recentBadges = data
            .sort((a, b) => new Date(b.earned_date) - new Date(a.earned_date))
            .slice(0, 4);
          setBadges(recentBadges);
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

  if (!userId || loading) {
    return null;
  }

  if (badges.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl">Badges</h2>
          <Link
            to="/badges"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            See All
          </Link>
        </div>
        <p className="text-gray-500 text-sm">No badges earned yet</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl">Badges</h2>
        <Link
          to="/badges"
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          See All
        </Link>
      </div>
      <div className="flex flex-wrap gap-3 justify-start">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="flex flex-col items-start gap-2"
            title={badge.name}
          >
            <Avatar
              isBordered
              color="default"
              className="w-14 h-14"
              src={`/assets/${badge.icon}`}
              name={badge.name}
            />
            <p className="text-xs text-gray-600 text-left max-w-[80px] truncate">
              {badge.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
