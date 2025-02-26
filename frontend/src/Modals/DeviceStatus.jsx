import React, { useState, useEffect } from "react";
// CSS
import "../assets/style.css";

const DeviceStatus = () => {
  // State to store ESP32 connection status
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    // Function to fetch ESP32 status
    const fetchStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/esp32/status"); // Backend endpoint
        const data = await response.json();

        // Check if there's an error in response
        if (data.error) {
          setStatus("❌");
        } else {
          setStatus("✅");
        }
      } catch (error) {
        setStatus("❌");
      }
    };

    fetchStatus(); // Call function immediately when component mounts

    // Auto-refresh status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  return (
    <div>
      Device Status:{" "}
      <span style={{ color: status.includes("Connected") ? "green" : "red" }}>
        {status}
      </span>
    </div>
  );
};

export default DeviceStatus;
