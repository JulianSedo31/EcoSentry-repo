import { useEffect, useState } from "react";
import io from "socket.io-client";
import "./style.css";

const socket = io("http://localhost:5000");

function RealTimeMonitoring() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch initial detections
    const fetchDetections = async () => {
      try {
        console.log("Fetching detections from API...");
        const response = await fetch("http://localhost:5000/api/detections");
        console.log("API Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received data:", data);
        
        if (!Array.isArray(data)) {
          throw new Error("Received invalid data format");
        }
        
        setDetections(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching detections:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    // Socket connection handling
    socket.on("connect", () => {
      console.log("Socket connected successfully");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Fetch initial data
    fetchDetections();

    // Listen for real-time updates
    socket.on("chainsawDetected", (newDetection) => {
      console.log("New detection received:", newDetection);
      setDetections((prevDetections) => [newDetection, ...prevDetections]);
    });

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up socket listeners");
      socket.off("chainsawDetected");
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  if (loading) {
    return (
      <div className="realtime-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading detections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="realtime-container">
        <div className="error">
          <p>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="realtime-container">
      <div className="realtime-header">
        <h2>Real-Time Monitoring</h2>
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span className="status-text">Connected to MongoDB Atlas</span>
        </div>
      </div>

      <div className="detections-list">
        {detections.length === 0 ? (
          <div className="no-detections">
            <p>No detections found</p>
          </div>
        ) : (
          detections.map((detection, index) => (
            <div key={index} className="detection-card">
              <div className="detection-header">
                <span className="detection-type">Chainsaw Detection</span>
                <span className="detection-time">
                  {new Date(detection.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="detection-content">
                <p>{detection.detection}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default RealTimeMonitoring;