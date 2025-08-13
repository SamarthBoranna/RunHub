import "leaflet/dist/leaflet.css";
import polyline from "@mapbox/polyline";
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMap,
  Tooltip,
} from "react-leaflet";
import { useActivities } from "./ActivitiesContext";
import { useEffect, useMemo } from "react";
import { Card, Button, Link, Progress } from "@heroui/react";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

// Component to automatically center the map based on recent coordinates
function MapCenterUpdater({ coords }) {
  const map = useMap();

  useEffect(() => {
    if (coords && coords.length > 0) {
      map.setView(coords, 13, { animate: true });
    }
  }, [coords, map]);

  return null;
}

function Heatmap() {
  const { activities, isAuthorized, fetchActivities } = useActivities();

  // Fetch activities if user is authorized but data not yet loaded
  useEffect(() => {
    if (!activities && isAuthorized) {
      fetchActivities();
    }
  }, [isAuthorized, activities, fetchActivities]);

  // Decode polylines only when activities change and grab recent coordinates
  const { decodedPolylines, recentCoords } = useMemo(() => {
    if (!activities || activities.length === 0) {
      return { decodedPolylines: [], recentCoords: [] };
    }

    const decoded = activities
      .map((act) =>
        act.map?.summary_polyline
          ? {
              coords: polyline.decode(act.map.summary_polyline),
              activityName: act.name,
            }
          : null
      )
      .filter(Boolean);

    // Assume activities[0] is the most recent run
    const recent = decoded.length > 0 ? decoded[0].coords[0] : [];

    return {
      decodedPolylines: decoded,
      recentCoords: recent,
    };
  }, [activities]);

  return (
    <div className="p-6 w-full" style={{ height: "86vh" }}>
      <Card className="w-full h-full">
        <MapContainer
          center={[0, 0]} // will be overridden by <MapCenterUpdater>
          zoom={2}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          maxBounds={[
            [-90, -180], // Southwest corner lat,lng
            [90, 180], // Northeast corner lat,lng
          ]}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`}
            attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
          />

          {/* Draw each polyline */}
          {decodedPolylines.map(({ coords, activityName }, idx) => (
            <Polyline
              key={idx}
              positions={coords}
              pathOptions={{
                color: "red", // Tailwind blue-500 or your theme's primary
                weight: 2,
                opacity: 0.8,
                lineJoin: "round",
                lineCap: "round",
              }}
            >
              <Tooltip sticky direction="top" offset={[0, -10]} opacity={0.9}>
                {activityName}
              </Tooltip>
            </Polyline>
          ))}
          {/* <AutoCenter polylines={decodedPolylines} /> */}
          <MapCenterUpdater coords={recentCoords} />
        </MapContainer>
      </Card>
      {!isAuthorized && (
        <div className="flex justify-center mt-4">
          <Button
            as={Link}
            href="http://localhost:5050/authorize"
            color="primary"
            size="md"
            variant="flat"
          >
            Authorize with Strava
          </Button>
        </div>
      )}
      {isAuthorized && !activities && (
        <div className="text-center mt-4">
          Loading activities
          <Progress
            isIndeterminate
            aria-label="Loading..."
            className="mt-1 w-50 mx-auto"
            size="sm"
          />
        </div>
      )}
    </div>
  );
}

export default Heatmap;
