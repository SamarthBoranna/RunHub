import { createContext, useContext, useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
const ActivitiesContext = createContext();

export function ActivitiesProvider({ children }) {
  const [activities, setActivities] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  // Load user ID on component mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("runhub_user_id");
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      setIsAuthorized(false);
    }
  }, []);

  const fetchActivities = async () => {
    try {
      const apiKey = localStorage.getItem("runhub_api_key");
      const storedUserId = localStorage.getItem("runhub_user_id");

      if (!apiKey || !storedUserId) {
        setIsAuthorized(false);
        return { success: false };
      }

      const res = await fetch(`${API_BASE}/api/activities/${storedUserId}`, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (!res.ok) {
        setIsAuthorized(false);
        return { success: false };
      }

      const data = await res.json();
      setActivities(data);
      return { success: true };
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      setIsAuthorized(false);
      return { success: false, error };
    }
  };

  const refreshActivities = async () => {
    try {
      setIsRefreshing(true);

      const apiKey = localStorage.getItem("runhub_api_key");
      const storedUserId = localStorage.getItem("runhub_user_id");

      if (!apiKey || !storedUserId) {
        setIsAuthorized(false);
        return { success: false };
      }

      const res = await fetch(`${API_BASE}/api/refresh/${storedUserId}`, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (!res.ok) {
        setIsAuthorized(false);
        return { success: false };
      }

      const data = await res.json();

      if (data.activities) {
        setActivities(data.activities);
        return {
          success: true,
          newActivities: data.changes?.added || 0,
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
