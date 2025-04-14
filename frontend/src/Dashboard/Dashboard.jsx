// LEAFLET MAP
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from 'leaflet';
import { useState, useEffect } from 'react';
import "leaflet/dist/leaflet.css";
// CSS
import "./style.css"; // Import the updated CSS
// COMPONENTS
import DetectionAlert from "../components/DetectionAlert";

const canAyanCoordinates = [8.154557, 125.151347]; // Can-ayan Coordinates
const cabanglasanCoordinates = [8.0833, 125.3000]; // Cabanglasan Coordinates

// Create custom icons
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const alertIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
  iconSize: [35, 51], // Larger size for alert
  iconAnchor: [17, 51],
  popupAnchor: [1, -34],
  shadowSize: [51, 51]
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
        const response = await fetch('http://localhost:5000/api/detection');
        const data = await response.json();
        
        // Filter for chainsaw alerts
        const chainsawAlerts = data.filter(detection => 
          detection.detection.includes('Chainsaw')
        );
        
        // Check if there's a new alert that occurred after page load
        if (chainsawAlerts.length > 0) {
          const newestAlert = chainsawAlerts[0];
          const alertTime = new Date(newestAlert.timestamp);
          
          // Only show alert if it's newer than page load time and different from last detection
          if (alertTime > pageLoadTime && 
              (!latestDetection || newestAlert._id !== latestDetection._id)) {
            setLatestDetection(newestAlert);
            setAlertOpen(true);
          }
        }
        
        setAlerts(chainsawAlerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
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
          <Popup>
            Can-ayan, Malaybalay City
          </Popup>
        </Marker>
        <Marker position={cabanglasanCoordinates} icon={blueIcon}>
          <Popup>
            Cabanglasan, Bukidnon
          </Popup>
        </Marker>
        
        {/* Render alert markers */}
        {alerts.map((alert, index) => (
          <Marker 
            key={alert._id || index} 
            position={alert.location === 'Can-ayan' ? canAyanCoordinates : cabanglasanCoordinates}
            icon={alertIcon}
          >
            <Popup>
              <div>
                <strong>🚨 Chainsaw Alert!</strong>
                <p>Location: {alert.location}</p>
                <p>Device: {alert.device}</p>
                <p>Time: {new Date(alert.timestamp).toLocaleString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default Dashboard;
