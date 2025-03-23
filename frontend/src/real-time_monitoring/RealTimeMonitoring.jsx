import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000"); // Adjust server URL if necessary

function RealTimeMonitoring() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Listen for real-time data updates
    socket.on("real-time-data", (newData) => {
      setData((prevData) => [...prevData, newData]); // Append new data
    });

    return () => {
      socket.off("real-time-data"); // Clean up on unmount
    };
  }, []);

  return (
    <div className="real-time-container">
      <h2>Real-Time Monitoring</h2>
      <ul>
        {data.map((item, index) => (
          <li key={index}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
}

export default RealTimeMonitoring;