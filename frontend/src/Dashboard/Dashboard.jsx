import React, { useState } from "react";
// COMPONENT
import AlertModal from "../Modals/AlertModal";
import DeviceStatus from "../Modals/DeviceStatus";
// MAP
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
// CSS
import "../assets/style.css"; // Import your styles

const localCoordinates = [8.154557, 125.151347]; // Malaybalay Coordinates

const Dashboard = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Function to trigger the alert
  const triggerAlert = () => {
    setAlertMessage("Illegal logging detected in Forest A!");
    setShowAlert(true);
  };

  // Function to close the alert
  const closeAlert = () => {
    setShowAlert(false);
  };

  return (
    <div className="map-container">
      {/* Main container is the map */}
      {/* Full-screen Map */}
      <MapContainer center={localCoordinates} zoom={15} className="map">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[8.164687426578574, 125.16148521189409]}>
          <Popup>Test</Popup>
        </Marker>
      </MapContainer>
      {/* Floating UI buttons*/}
      <div className="floating-ui">
        <button onClick={triggerAlert} className="test-alert-btn">
          Simulate Alerts
        </button>
      </div>
      {/* Alert Modal */}
      <AlertModal
        show={showAlert}
        onClose={closeAlert}
        alertMessage={alertMessage}
      />
      {/* Device Status */}
      <div className="deviceStatus">
        <DeviceStatus />
      </div>
    </div>
  );
};

export default Dashboard;
