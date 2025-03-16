import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
// ICONS
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
// IMG
import ecosentryLogo from "../assets/ecosentry.png";
import loginBackground from "../assets/bg1.jpg";

function Login() {
  // State for username, password, and error messages
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Hook for navigation

  // Handle form submission
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page reload

    setError(""); // Clear previous errors

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

      // Redirect to dashboard (/app)
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="vh-100 d-flex flex-column">
      {/* Navbar-like Logo Section */}
      <div className="p-3">
        <img
          src={ecosentryLogo}
          alt="EcoSentry Logo"
          className="img-fluid"
          style={{ maxWidth: "250px", height: "auto" }}
        />
      </div>

      {/* Main Content Section */}
      <div className="container-fluid">
        <div className="row">
          {/* Left Section: Login Form */}
          <div
            className="col-12 col-lg-7 col-md-8 d-flex justify-content-center align-items-center mt-3"
            id="loginForm"
          >
            <div
              className="card p-4 shadow-lg text-center"
              style={{ width: "100%", maxWidth: "30rem", height: "20rem" }}
            >
              <h2 style={{ fontWeight: "bold" }}>Sign in</h2>
              <p style={{ fontSize: ".8rem" }}>
                Stay updated on environmental threats
              </p>

              {error && (
                <div
                  className="alert alert-danger"
                  style={{
                    fontSize: "0.8rem",
                    padding: "5px",
                    marginBottom: "10px",
                    textAlign: "center",
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                {/* Username Input with Icon */}
                <div className="mb-3 input-group">
                  <span className="input-group-text">
                    <FaUser />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                {/* Password Input with Icon */}
                <div className="mb-3 input-group">
                  <span className="input-group-text">
                    <FaLock />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span
                    className="input-group-text"
                    style={{ cursor: "pointer" }}
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
                >
                  Login
                </button>
              </form>
            </div>
          </div>

          {/* Right Section: Image (Hidden on Small Screens) */}
          <div className="col-lg-4 col-md-4 d-none d-md-block p-0">
            <img
              src={loginBackground}
              alt="Login Background"
              className="img-fluid w-70 h-80"
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
