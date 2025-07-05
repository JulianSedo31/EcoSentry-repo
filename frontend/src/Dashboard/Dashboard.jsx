// LEAFLET MAP
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useState, useEffect } from "react";
import "leaflet/dist/leaflet.css";
// CSS
import "./style.css";
// COMPONENTS
import DetectionAlert from "../components/DetectionAlert";

const canAyanCoordinates = [8.154557, 125.151347]; // Can-ayan Coordinates
const cabanglasanCoordinates = [8.0833, 125.3]; // Cabanglasan Coordinates

// Create custom icons
const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: null,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: null,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const alertIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
  iconSize: [35, 51], // Larger size for alert
  iconAnchor: [17, 51],
  popupAnchor: [1, -34],
  shadowSize: [51, 51],
});

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [latestDetection, setLatestDetection] = useState(null);
  const [pageLoadTime] = useState(new Date()); // Store when the page was loaded

  useEffect(() => {
    // Function to fetch alerts
    const fetchAlerts = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/detection?includeArchived=false"
        );
        const data = await response.json();

        // Filter for chainsaw alerts
        const chainsawAlerts = data.filter((detection) =>
          detection.detection.includes("Chainsaw")
        );

        // Check if there's a new alert that occurred after page load
        if (chainsawAlerts.length > 0) {
          const newestAlert = chainsawAlerts[0];
          const alertTime = new Date(newestAlert.timestamp);

          // Check if the current latestDetection still exists in the fetched data
          const currentDetectionStillExists =
            latestDetection &&
            chainsawAlerts.some(
              (detection) => detection._id === latestDetection._id
            );

          // Only show alert if it's newer than page load time and different from last detection
          if (
            alertTime > pageLoadTime &&
            (!latestDetection || newestAlert._id !== latestDetection._id)
          ) {
            // Only trigger alert if the current detection still exists (meaning it's a truly new detection)
            if (!latestDetection || currentDetectionStillExists) {
              setLatestDetection(newestAlert);
              setAlertOpen(true);
            } else {
              // Current detection was archived, just update to the newest one without triggering alert
              setLatestDetection(newestAlert);
            }
          }
        } else {
          // No chainsaw alerts found, clear the latest detection
          setLatestDetection(null);
        }

        setAlerts(chainsawAlerts);
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    // Initial fetch
    fetchAlerts();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchAlerts, 5000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [latestDetection, pageLoadTime]);

  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  return (
    <div className="dashboard">
      {/* Alert Notification */}
      <DetectionAlert
        open={alertOpen}
        message={latestDetection?.detection || ""}
        onClose={handleAlertClose}
        detectionId={latestDetection?._id}
        device={latestDetection?.device}
        location={latestDetection?.location}
        s
      />

      {/* Fullscreen Map */}
      <MapContainer
        center={canAyanCoordinates} // Center on Can-ayan
        zoom={12}
        className="map-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={canAyanCoordinates} icon={redIcon}>
          <Popup closeButton={false} autoPan={false}>
            <div>
              <strong>Device: Sentry 1</strong>
              <p>Location: Can-ayan, Malaybalay City</p>
            </div>
          </Popup>
        </Marker>
        <Marker position={cabanglasanCoordinates} icon={blueIcon}>
          <Popup closeButton={false} autoPan={false}>
            <div>
              <strong>Device: Sentry 2</strong>
              <p>Location: Cabanglasan, Bukidnon</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default Dashboard;
