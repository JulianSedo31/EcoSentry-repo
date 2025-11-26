// LEAFLET MAP
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useState, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
// CSS
import "./style.css";
// COMPONENTS
import DetectionAlert from "../components/DetectionAlert";
import { database, ref, onValue } from "../firebase-config";

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
  // Timezone used for server timestamps (displayed across the UI)
  const DISPLAY_TZ = "Asia/Kuala_Lumpur";
  // Normalize ISO timestamp strings that lack an explicit timezone offset
  const normalizeISOWithTZ = (ts) => {
    if (!ts) return ts;
    if (typeof ts !== "string") return ts;
    if (/[Zz]$/.test(ts) || /[+\-]\d{2}:\d{2}$/.test(ts)) return ts;
    return ts + "+08:00";
  };

  const formatTimestamp = (timestamp) => {
    try {
      const normalized = normalizeISOWithTZ(timestamp);
      const dt = normalized ? new Date(normalized) : new Date();
      return new Intl.DateTimeFormat("en-US", {
        timeZone: DISPLAY_TZ,
        dateStyle: "medium",
        timeStyle: "medium",
        timeZoneName: "short",
      }).format(dt);
    } catch (e) {
      const normalized = normalizeISOWithTZ(timestamp);
      return normalized
        ? new Date(normalized).toLocaleString()
        : new Date().toLocaleString();
    }
  };
  // const [alerts, setAlerts] = useState([]); // no longer used after deduplicating markers
  const [alertOpen, setAlertOpen] = useState(false);
  const [latestDetection, setLatestDetection] = useState(null);
  const [pageLoadTime] = useState(new Date()); // Store when the page was loaded
  const [gpsPosition, setGpsPosition] = useState(null);
  const [alertMarkers, setAlertMarkers] = useState([]); // Store GPS alert markers
  const [liveGpsCoordinates, setLiveGpsCoordinates] = useState(null); // Real-time GPS from detections
  const [gpsPinVisible, setGpsPinVisible] = useState(false); // Control pin visibility
  const [gpsPinTimer, setGpsPinTimer] = useState(null); // Timer for pin visibility
  const markerRef = useRef();

  // Function to parse detection message and remove prefix
  const parseDetectionMessage = (msg) => {
    if (!msg) return { cleanMessage: "", coordinates: null };

    // Remove PKT#xxx|DeviceName| prefix
    const parts = msg.split("|");
    let cleanMessage = msg;
    let coordinates = null;

    if (parts.length >= 3) {
      // Extract the actual message after the second |
      cleanMessage = parts.slice(2).join("|");

      // Parse GPS coordinates from ALERT,CHAINSAW,lat,lon format
      if (cleanMessage.startsWith("ALERT,CHAINSAW,")) {
        const coords = cleanMessage.split(",");
        if (
          coords.length >= 4 &&
          coords[2] !== "NOFIX" &&
          coords[3] !== "NOFIX"
        ) {
          coordinates = {
            latitude: parseFloat(coords[2]),
            longitude: parseFloat(coords[3]),
          };
        }
      }
    }

    return { cleanMessage, coordinates };
  };

  useEffect(() => {
    // Function to fetch alerts
    const fetchAlerts = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/detection?includeArchived=false"
        );
        const data = await response.json();

        console.log("📊 Fetched detections:", data.length);

        // Filter for chainsaw alerts (case-insensitive)
        const chainsawAlerts = data.filter((detection) =>
          detection.detection.toLowerCase().includes("chainsaw")
        );

        console.log("🚨 Chainsaw alerts found:", chainsawAlerts.length);

        // Extract GPS coordinates from alerts and create markers
        const gpsAlerts = chainsawAlerts.filter((detection) => {
          // Check if coordinates are in the detection message or in separate fields
          const { coordinates } = parseDetectionMessage(detection.detection);
          return (detection.latitude && detection.longitude) || coordinates;
        });

        console.log("🗺️ GPS alerts found:", gpsAlerts.length);

        // Debug: Show first GPS alert details
        if (gpsAlerts.length > 0) {
          const { coordinates } = parseDetectionMessage(gpsAlerts[0].detection);
          console.log("📍 First GPS alert:", {
            lat: gpsAlerts[0].latitude || coordinates?.latitude,
            lon: gpsAlerts[0].longitude || coordinates?.longitude,
            detection: gpsAlerts[0].detection,
            timestamp: gpsAlerts[0].timestamp,
          });
        }

        // Deduplicate GPS alerts by device: keep only the most recent alert per device
        const markerByDevice = {};
        gpsAlerts.forEach((detection) => {
          const { coordinates } = parseDetectionMessage(detection.detection);
          const position = [
            detection.latitude || coordinates?.latitude,
            detection.longitude || coordinates?.longitude,
          ];

          // If device is missing, fall back to id to avoid clobbering
          const key = detection.device || detection._id;

          // If we haven't seen this device or this detection is newer, store it
          if (
            !markerByDevice[key] ||
            new Date(normalizeISOWithTZ(detection.timestamp)) >
              new Date(normalizeISOWithTZ(markerByDevice[key].timestamp))
          ) {
            markerByDevice[key] = {
              id: detection._id,
              position,
              timestamp: detection.timestamp,
              device: detection.device,
              detection: detection.detection,
            };
          }
        });

        // Convert the map to an array of markers
        const newAlertMarkers = Object.values(markerByDevice);
        setAlertMarkers(newAlertMarkers);

        // Update live GPS coordinates with the most recent detection
        if (gpsAlerts.length > 0) {
          const latestGpsAlert = gpsAlerts[0]; // Most recent GPS alert
          const { coordinates } = parseDetectionMessage(
            latestGpsAlert.detection
          );
          const newCoordinates = [
            latestGpsAlert.latitude || coordinates?.latitude,
            latestGpsAlert.longitude || coordinates?.longitude,
          ];

          // Check if coordinates have changed
          if (
            !liveGpsCoordinates ||
            Math.abs(liveGpsCoordinates[0] - newCoordinates[0]) > 0.0001 ||
            Math.abs(liveGpsCoordinates[1] - newCoordinates[1]) > 0.0001
          ) {
            console.log("🔄 New GPS coordinates received:", newCoordinates);
            setLiveGpsCoordinates(newCoordinates);
            setGpsPinVisible(true);

            // Clear existing timer
            if (gpsPinTimer) {
              clearTimeout(gpsPinTimer);
            }

            // Set new timer to hide pin after 10 seconds
            const timer = setTimeout(() => {
              console.log("⏰ GPS pin timer expired, hiding pin");
              setGpsPinVisible(false);
            }, 10000); // 10 seconds

            setGpsPinTimer(timer);
          }
        }

        // Check if there's a new alert that occurred after page load
        if (chainsawAlerts.length > 0) {
          const newestAlert = chainsawAlerts[0];
          const alertTime = new Date(normalizeISOWithTZ(newestAlert.timestamp));

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

        // alerts are processed/deduplicated into alertMarkers; no need to store full list here
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    // Initial fetch
    fetchAlerts();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchAlerts, 5000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(interval);
      if (gpsPinTimer) {
        clearTimeout(gpsPinTimer);
      }
    };
  }, [latestDetection, pageLoadTime, liveGpsCoordinates, gpsPinTimer]);

  // Replace the GPS-fetching useEffect with this:
  useEffect(() => {
    const gpsRef = ref(database, "gps_data");
    const unsubscribe = onValue(gpsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.latitude && data.longitude) {
        setGpsPosition([data.latitude, data.longitude]);
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

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
        timestamp={latestDetection?.timestamp}
        latitude={latestDetection?.latitude}
        longitude={latestDetection?.longitude}
      />

      {/* Fullscreen Map */}
      <MapContainer
        center={liveGpsCoordinates || canAyanCoordinates} // Center on live GPS or fallback
        zoom={15}
        className="map-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* Live GPS Coordinates Pin - Shows for 10 seconds when new coordinates arrive */}
        {liveGpsCoordinates && gpsPinVisible && (
          <Marker position={liveGpsCoordinates} icon={redIcon}>
            <Popup closeButton={false} autoPan={false}>
              <div>
                <strong>🚨 Live GPS Detection</strong>
                <p>
                  <strong>Device:</strong> EcoSentry-Rx
                </p>
                <p>
                  <strong>Location:</strong> Can-ayan, Bukidnon
                </p>
                <p>
                  <strong>GPS:</strong> {liveGpsCoordinates[0].toFixed(8)},{" "}
                  {liveGpsCoordinates[1].toFixed(8)}
                </p>
                <p>
                  <strong>Status:</strong> Real-time Monitoring
                </p>
                <p>
                  <strong>Last Update:</strong> {formatTimestamp()}
                </p>
                <p>
                  <strong>Pin Duration:</strong> 10 seconds
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Fallback Static Marker */}
        {!liveGpsCoordinates && (
          <Marker position={canAyanCoordinates} icon={blueIcon}>
            <Popup closeButton={false} autoPan={false}>
              <div>
                <strong>Device: Sentry 1</strong>
                <p>Location: Can-ayan, Malaybalay City</p>
                <p>Status: Waiting for GPS data...</p>
              </div>
            </Popup>
          </Marker>
        )}
        <Marker position={cabanglasanCoordinates} icon={blueIcon}>
          <Popup closeButton={false} autoPan={false}>
            <div>
              <strong>Device: Sentry 2</strong>
              <p>Location: Cabanglasan, Bukidnon</p>
            </div>
          </Popup>
        </Marker>
        {/* GPS Dongle Marker */}
        {gpsPosition && (
          <Marker position={gpsPosition} icon={alertIcon} ref={markerRef}>
            <Popup closeButton={false} autoPan={false}>
              <div>
                <strong>Device: GPS Dongle</strong>
                <p>Live Location</p>
                <p>Lat: {gpsPosition[0]}</p>
                <p>Lon: {gpsPosition[1]}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* GPS Alert Markers */}
        {alertMarkers.map((marker) => {
          const { cleanMessage } = parseDetectionMessage(marker.detection);
          return (
            <Marker key={marker.id} position={marker.position} icon={alertIcon}>
              <Popup closeButton={false} autoPan={false}>
                <div>
                  <strong>🚨 Chainsaw Alert</strong>
                  <p>
                    <strong>Device:</strong> {marker.device}
                  </p>
                  <p>
                    <strong>Time:</strong> {formatTimestamp(marker.timestamp)}
                  </p>
                  <p>
                    <strong>Latitude:</strong> {marker.position[0].toFixed(8)}
                  </p>
                  <p>
                    <strong>Longitude:</strong> {marker.position[1].toFixed(8)}
                  </p>
                  <p>
                    <strong>Detection:</strong> {cleanMessage}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default Dashboard;
