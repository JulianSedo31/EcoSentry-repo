import React, { useState, useEffect } from "react";
// MAP
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css"; // Import Leaflet CSS

const localCoordinates = [8.154557, 125.151347]; // Malaybalay Coordinates

const Dashboard = () => {
  const [detection, setDetection] = useState({ type: "normal", confidence: 100 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:5000/latest-detection");
        const data = await response.json();
        setDetection(data);
      } catch (error) {
        console.error("Error fetching detection data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer center={localCoordinates} zoom={15} style={{ height: "100%", width: "100%" }}>
      {/* Tile Layer - This loads the actual map */}
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* IoT Device Marker with Chainsaw Detection Popup */}
      <Marker position={[8.164687426578574, 125.16148521189409]}>
        <Popup>
          <h3>Chainsaw Detection</h3>
          <p><strong>Type:</strong> {detection.type}</p>
          <p><strong>Confidence:</strong> {detection.confidence}%</p>
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default Dashboard;
