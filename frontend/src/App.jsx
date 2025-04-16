import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
// PAGES
import Login from "./login/Login";
import Layout from "./Layout/Layout";
import Dashboard from "./Dashboard/Dashboard";
import Reports from "./Reports/Reports";
import PrivateRoute from "/PrivateRoute";
import DetectionAlert from "./components/DetectionAlert";

function App() {
  const [alertOpen, setAlertOpen] = useState(false);
  const [latestDetection, setLatestDetection] = useState(null);

  // Function to check for new detections
  const checkForNewDetections = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/detection");
      const data = await response.json();

      if (data.length > 0) {
        const newestDetection = data[0];

        if (latestDetection && newestDetection._id !== latestDetection._id) {
          setLatestDetection(newestDetection);
          setAlertOpen(true);
        } else if (!latestDetection) {
          setLatestDetection(newestDetection);
        }
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
            localStorage.getItem("token") ? (
              <Navigate to="/app" replace />
            ) : (
              <Login />
            )
          }
        />

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/app" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Route>

        {/* Catch all other routes and redirect to dashboard if authenticated, otherwise to login */}
        <Route
          path="*"
          element={
            localStorage.getItem("token") ? (
              <Navigate to="/app" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>

      {/* Alert Modal - Will appear on top of any page */}
      <DetectionAlert
        open={alertOpen}
        message={latestDetection?.detection || ""}
        onClose={handleAlertClose}
      />
    </BrowserRouter>
  );
}

export default App;
