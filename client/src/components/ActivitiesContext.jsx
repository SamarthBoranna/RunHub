import { createContext, useContext, useState } from "react";

const ActivitiesContext = createContext();

export function ActivitiesProvider({ children }) {
  const [activities, setActivities] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Asynchronous function to fetch activities from the server
  const fetchActivities = async () => {
    try {
      const res = await fetch("http://localhost:5050/api/recentActivities", {
        credentials: "include",
      });
      if (!res.ok) {
        setIsAuthorized(false);
        setActivities([]);
        return;
      }
      const data = await res.json();

      if (Array.isArray(data)) {
        setActivities(data);
      } else {
        setActivities([]);
        setIsAuthorized(false);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      setActivities([]);
      setIsAuthorized(false);
    }
  };

  // Provides the activities data and loading state to components
  return (
    <ActivitiesContext.Provider
      value={{ activities, isAuthorized, fetchActivities }}
    >
      {children}
    </ActivitiesContext.Provider>
  );
}

// React hook that provides components access to activities data and loading state
export function useActivities() {
  return useContext(ActivitiesContext);
}
