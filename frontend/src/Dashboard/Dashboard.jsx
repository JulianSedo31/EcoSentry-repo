import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Box, Paper, Typography } from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import TodayIcon from "@mui/icons-material/Today";
// CSS
import "./style.css"; // Import the updated CSS

const localCoordinates = [8.154557, 125.151347]; // Malaybalay Coordinates

function Dashboard() {
  const [totalDetections, setTotalDetections] = useState(0);
  const [todayDetections, setTodayDetections] = useState(0);

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/detection');
        if (!response.ok) {
          throw new Error('Failed to fetch detections');
        }
        const data = await response.json();
        
        // Set total detections
        setTotalDetections(data.length);
        
        // Calculate today's detections
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDetections = data.filter(detection => {
          const detectionDate = new Date(detection.timestamp);
          return detectionDate >= today;
        });
        setTodayDetections(todayDetections.length);
      } catch (error) {
        console.error('Error fetching detections:', error);
      }
    };

    fetchDetections();
    // Update every 5 seconds
    const interval = setInterval(fetchDetections, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      {/* Statistics Squares */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 20, 
        left: '50%', 
        transform: 'translateX(-50%)',
        zIndex: 1000, 
        display: 'flex', 
        gap: 2,
        justifyContent: 'center',
        width: '100%'
      }}>
        {/* Total Detections */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            minWidth: '200px'
          }}
        >
          <WarningIcon sx={{ color: '#e65100', fontSize: 30 }} />
          <Box>
            <Typography variant="h6" sx={{ color: '#e65100' }}>
              {totalDetections}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Chainsaw Detections
            </Typography>
          </Box>
        </Paper>

        {/* Today's Detections */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            minWidth: '200px'
          }}
        >
          <TodayIcon sx={{ color: '#1976d2', fontSize: 30 }} />
          <Box>
            <Typography variant="h6" sx={{ color: '#1976d2' }}>
              {todayDetections}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Today's Detections
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Fullscreen Map */}
      <MapContainer
        center={localCoordinates} // Location Malaybalay
        zoom={15}
        className="map-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
      </MapContainer>
    </div>
  );
}

export default Dashboard;
