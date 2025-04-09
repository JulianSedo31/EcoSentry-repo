// ICONS
import { IoNotificationsOutline } from "react-icons/io5";
import { BsBatteryFull, BsBatteryHalf, BsBattery } from "react-icons/bs";
import { MdWifi, MdWifiOff } from "react-icons/md";
// CSS
import "./style.css"; // Import styles
// Import useState and useEffect from React
import { useState, useEffect } from "react";
// Import axios for API requests
import axios from "axios";

function Navbar() {
  const isConnected = true; // Static value for now
  const batteryLevel = 50; // Example battery percentage

  // Add state for today's and this week's detections
  const [todaysDetectionsCount, setTodaysDetectionsCount] = useState(0);
  const [weeklyDetectionsCount, setWeeklyDetectionsCount] = useState(0);

  // Fetch today's and this week's detections from the API
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/detection");
        const detections = response.data;

        // Calculate today's detections
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const todaysCount = detections.filter((detection) => {
          const detectionDate = new Date(detection.timestamp);
          return (
            detectionDate >= startOfDay &&
            detectionDate < endOfDay &&
            detection.detection.includes("Chainsaw")
          );
        }).length;

        // Calculate this week's detections
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const weeklyCount = detections.filter((detection) => {
          const detectionDate = new Date(detection.timestamp);
          return (
            detectionDate >= startOfWeek &&
            detectionDate < endOfWeek &&
            detection.detection.includes("Chainsaw")
          );
        }).length;

        setTodaysDetectionsCount(todaysCount);
        setWeeklyDetectionsCount(weeklyCount);
      } catch (error) {
        console.error("Error fetching detections:", error);
      }
    };

    fetchDetections();
  }, []);

  let BatteryIcon = BsBattery;
  if (batteryLevel > 75) BatteryIcon = BsBatteryFull;
  else if (batteryLevel > 40) BatteryIcon = BsBatteryHalf;

  return (
    <nav className="navbar">
      {/* Device Status Section (Single Row) */}
      <div className="navbar-status">
        <p className="status-label">Device Status:</p>

        {/* Connection Status */}
        <div className="status-item">
          {isConnected ? (
            <>
              <MdWifi className="status-icon connected" />
              <span className="status-text">Connected</span>
            </>
          ) : (
            <>
              <MdWifiOff className="status-icon disconnected" />
              <span className="status-text">Disconnected</span>
            </>
          )}
        </div>

        {/* Battery Status */}
        <div className="status-item">
          <BatteryIcon className="status-icon" />
          <span className="status-text">{batteryLevel}%</span>
          <span className="status-text">Today: {todaysDetectionsCount}</span>
          <span className="status-text">This Week: {weeklyDetectionsCount}</span>
        </div>

        {/* Notification Icon //remove sa nako
        <IoNotificationsOutline className="notification-icon" /> */}
      </div>
    </nav>
  );
}

export default Navbar;
