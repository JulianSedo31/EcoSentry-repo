import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// PAGES
import Login from "./login/Login";
import Layout from "./Layout/Layout";
import Dashboard from "./Dashboard/Dashboard";
import Reports from "./Reports/Reports";
import PrivateRoute from "/PrivateRoute";
import RealTimeMonitoring from "./real-time_monitoring/RealTimeMonitoring"; // Ensure correct path
function App() {
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
            <Route path="real-time" element={<RealTimeMonitoring />} />
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
    </BrowserRouter>
  );
}

export default App;
