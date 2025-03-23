import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
// PAGES
import Login from "./login/Login";
import Layout from "./Layout/Layout";
import Dashboard from "./Dashboard/Dashboard";
import Reports from "./Reports/Reports";

const theme = createTheme();

function App() {
  const isAuthenticated = localStorage.getItem("token");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public Route - Redirect to /app if already logged in */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/app" replace />
              ) : (
                <Login />
              )
            }
          />

          {/* Protected Routes */}
          <Route path="/app" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Catch all other routes and redirect to dashboard if authenticated, otherwise to login */}
          <Route
            path="*"
            element={
              isAuthenticated ? (
                <Navigate to="/app" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
