import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
// PAGES
import Login from "./login/Login";
import Layout from "./Layout/Layout";
import Dashboard from "./dashboard/Dashboard";
import Reports from "./reports/Reports";
import PrivateRoute from "/PrivateRoute";
import DetectionAlert from "./components/DetectionAlert";
import About from "./about/About.jsx";
import Sidebar from "./navigation/Sidebar";

function App() {
  // Track authentication token in state
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [alertOpen, setAlertOpen] = useState(false);
  const [latestDetection, setLatestDetection] = useState(null);

  // Function to check for new detections
  const checkForNewDetections = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/detection?includeArchived=false"
      );
      const data = await response.json();

      if (data.length > 0) {
        const newestDetection = data[0];

        // Check if the current latestDetection still exists in the fetched data
        const currentDetectionStillExists =
          latestDetection &&
          data.some((detection) => detection._id === latestDetection._id);

        if (latestDetection && newestDetection._id !== latestDetection._id) {
          // Only trigger alert if the current detection still exists (meaning it's a truly new detection)
          if (currentDetectionStillExists) {
            setLatestDetection(newestDetection);
            setAlertOpen(true);
          } else {
            // Current detection was archived, just update to the newest one without triggering alert
            setLatestDetection(newestDetection);
          }
        } else if (!latestDetection) {
          setLatestDetection(newestDetection);
        }
      } else {
        // No detections found, clear the latest detection
        setLatestDetection(null);
      }
    } catch (error) {
      console.error("Error fetching detections:", error);
    }
  };

  // Set up polling for new detections/check every 5 seconds
  useEffect(() => {
    const interval = setInterval(checkForNewDetections, 5000);
    return () => clearInterval(interval);
  }, [latestDetection]);

  // handles close of alert
  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route - Redirect to /app if already logged in */}
        <Route
          path="/"
          element={
            // Always show Login page if token is missing
            token ? (
              <Navigate to="/app" replace />
            ) : (
              <Login setToken={setToken} />
            )
          }
        />

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/app" element={<Layout setToken={setToken} />}>
            <Route index element={<Dashboard />} />
            <Route path="reports" element={<Reports />} />
            <Route path="about" element={<About />} />
          </Route>
        </Route>

        {/* Catch all other routes and redirect to dashboard if authenticated, otherwise to login */}
        <Route
          path="*"
          element={
            token ? <Navigate to="/app" replace /> : <Navigate to="/" replace />
          }
        />
      </Routes>

      {/* Alert Modal - Will appear on top of any page */}
      <DetectionAlert
        open={alertOpen}
        message={latestDetection?.detection || ""}
        onClose={handleAlertClose}
        detectionId={latestDetection?._id}
        device={latestDetection?.device}
        location={latestDetection?.location}
      />
    </BrowserRouter>
  );
}

export default App;
