import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
// ICONS
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
// IMG
import ecosentryLogo from "../assets/EcoSentryLogo.png";
import loginBackground from "../assets/deforestation.svg";
import penroLogo from "../assets/penroLogo.png";
// CSS
import "./style.css";

function Login({ setToken }) {
  // State for username, password, and error messages
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // State for loading spinner
  const navigate = useNavigate(); // Hook for navigation

  // Handle form submission
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page reload

    setError(""); // Clear previous errors
    setLoading(true); // Show spinner

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          username,
          password,
        }
      );

      // Store token in local storage
      localStorage.setItem("token", response.data.token);
      // Update token state in App
      setToken(response.data.token);

      // Redirect to dashboard (/app)
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      setLoading(false); // Hide spinner on error
    }
  };

  return (
    <div className="vh-100 d-flex flex-column justify-content-between">
      {/* Main Content Section */}
      <div className="vh-100 d-flex flex-column justify-content-center align-items-center px-3">
        {/* Logos */}
        <div className="d-flex align-items-center mb-3">
          <img
            src={ecosentryLogo}
            alt="EcoSentry Logo"
            style={{ maxWidth: "175px", height: "auto" }}
          />
          <img
            src={penroLogo}
            alt="Penro Logo"
            style={{ maxWidth: "100px", height: "auto" }}
          />
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-3">
          <h2 className="fw-bold text-center">Welcome to EcoSentry</h2>
          <p className="text-center" style={{ fontSize: "0.85rem" }}>
            Your platform for smarter environmental monitoring.
          </p>
        </div>

        {/* Login Form Card */}
        <div
          className="bg-white p-4 shadow rounded"
          style={{
            width: "100%",
            maxWidth: "400px",
          }}
        >
          {/* <h4 className="fw-bold text-center mb-4">Login</h4> */}

          {error && (
            <div className="alert alert-danger text-center py-2 mb-3">
              {error}
            </div>
          )}

          {loading && (
            <div className="spinner-overlay">
              <div className="spinner"></div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            {/* Username */}
            <div
              className="mb-4 input-group"
              style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}
            >
              <span
                className="input-group-text"
                style={{
                  border: "none",
                  background: "transparent",
                  paddingRight: "8px",
                }}
              >
                <FaUser />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                  background: "transparent",
                }}
              />
            </div>

            {/* Password */}
            <div
              className="mb-4 input-group"
              style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}
            >
              <span
                className="input-group-text"
                style={{
                  border: "none",
                  background: "transparent",
                  paddingRight: "8px",
                }}
              >
                <FaLock />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                  background: "transparent",
                }}
              />
              <span
                className="input-group-text"
                style={{
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                  paddingRight: "8px",
                }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <button
              type="submit"
              className="btn w-100"
              style={{
                backgroundColor: "#27323a",
                fontWeight: "bold",
                color: "white",
              }}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="text-center mt-auto py-2"
        style={{ fontSize: "0.8rem", color: "#888" }}
      >
        © 2025 EcoSentry. All rights reserved. <br />
      </footer>
    </div>
  );
}

export default Login;
