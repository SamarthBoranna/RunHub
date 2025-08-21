import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
const ActivitiesContext = createContext();

export function ActivitiesProvider({ children }) {
  const [activities, setActivities] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [userId, setUserId] = useState(null);

  // Set auth status function for other components to use
  const setAuthStatus = useCallback((status) => {
    setIsAuthorized(status);
  }, []);

  // Check for auth on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("runhub_user_id");

    if (storedUserId) {
      setUserId(storedUserId);
      setIsAuthorized(true);

      // Fetch user info and activities
      fetchUserInfo(storedUserId);
      fetchActivities(storedUserId);
    } else {
      console.log("No user_id in localStorage");
      setIsAuthorized(false);
      setIsLoading(false);
    }
  }, []);

  const fetchUserInfo = async (id) => {
    // Use provided ID or get from state/localStorage
    const userIdTemp = id || userId || localStorage.getItem("runhub_user_id");

    if (!userIdTemp) {
      console.log("No user ID available");
      return { success: false };
    }

    try {
      console.log(`Fetching user info for ${userIdTemp}`);
      const res = await fetch(`${API_BASE}/api/athlete/${userIdTemp}`);

      if (!res.ok) {
        console.error(`User info API error: ${res.status}`);
        return { success: false };
      }

      const data = await res.json();
      console.log("User info fetched:", data.firstname);
      setUserInfo(data);
      return { success: true };
    } catch (error) {
      console.error("Error fetching user info:", error);
      return { success: false, error };
    }
  };

  const fetchActivities = async (id) => {
    setIsLoading(true);

    // Use provided ID or get from state/localStorage
    const userIdTemp = id || userId || localStorage.getItem("runhub_user_id");

    if (!userIdTemp) {
      console.log("No user ID available");
      setIsAuthorized(false);
      setIsLoading(false);
      return { success: false };
    }

    try {
      console.log(`Fetching activities for user ${userIdTemp}`);
      const res = await fetch(`${API_BASE}/api/activities/${userIdTemp}`);

      if (!res.ok) {
        console.error(`Activities API error: ${res.status}`);
        setIsLoading(false);
        return { success: false };
      }

      const data = await res.json();
      console.log(`Fetched ${data.length} activities`);
      setActivities(data);
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      setIsLoading(false);
      return { success: false, error };
    }
  };

  const refreshActivities = async () => {
    try {
      setIsRefreshing(true);

      const storedUserId = userId || localStorage.getItem("runhub_user_id");

      if (!storedUserId) {
        console.log("No user ID available");
        setIsRefreshing(false);
        return { success: false };
      }

      console.log(`Refreshing activities for user ${storedUserId}`);
      const res = await fetch(`${API_BASE}/api/refresh/${storedUserId}`);

      if (!res.ok) {
        console.error(`Refresh API error: ${res.status}`);
        setIsRefreshing(false);
        return { success: false };
      }

      const data = await res.json();

      if (data.activities) {
        console.log(`Refreshed ${data.activities.length} activities`);
        setActivities(data.activities);
        setIsRefreshing(false);
        return {
          success: true,
          changes: data.changes || { added: 0, updated: 0, deleted: 0 },
          newActivities: data.changes?.added || 0,
        };
      } else {
        console.error("No activities in refresh response");
        setIsRefreshing(false);
        return { success: false };
      }
    } catch (error) {
      console.error("Error refreshing activities:", error);
      setIsRefreshing(false);
      return { success: false, error };
    }
  };

  const logout = () => {
    localStorage.removeItem("runhub_user_id");
    setIsAuthorized(false);
    setUserInfo(null);
    setActivities(null);
    setUserId(null);
  };

  return (
    <ActivitiesContext.Provider
      value={{
        activities,
        isAuthorized,
        isRefreshing,
        isLoading,
        userInfo,
        userId,
        fetchActivities,
        refreshActivities,
        logout,
        setAuthStatus,
      }}
    >
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useActivities() {
  return useContext(ActivitiesContext);
}
