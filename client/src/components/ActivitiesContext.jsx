import { createContext, useContext, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
const ActivitiesContext = createContext();

export function ActivitiesProvider({ children }) {
  const [activities, setActivities] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch activities from the database (no refresh)
  const fetchActivities = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/recentActivities`, {
        credentials: "include",
      });

      if (!res.ok) {
        setIsAuthorized(false);
        setActivities([]);
        return { success: false };
      }

      const data = await res.json();
      setActivities(data);
      return { success: true };
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      setActivities([]);
      setIsAuthorized(false);
      return { success: false, error };
    }
  };

  // Refresh activities from Strava and update the database
  const refreshActivities = async () => {
    try {
      setIsRefreshing(true);

      const res = await fetch(`${API_BASE}/api/refreshActivities`, {
        credentials: "include",
      });

      if (!res.ok) {
        setIsAuthorized(false);
        return { success: false };
      }

      const data = await res.json();

      // Update activities with the refreshed data
      if (data.activities) {
        setActivities(data.activities);
        return {
          success: true,
          newActivities: data.newActivities,
        };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error("Failed to refresh activities:", error);
      return { success: false, error };
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ActivitiesContext.Provider
      value={{
        activities,
        isAuthorized,
        isRefreshing,
        fetchActivities,
        refreshActivities,
      }}
    >
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useActivities() {
  return useContext(ActivitiesContext);
}
