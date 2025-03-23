//index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Import Routes
const authRoutes = require("./routes/auth");
const detectionRoutes = require("./routes/detectionRoutes");
const notificationSettingsRoutes = require("./routes/notificationSettingsRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Default Route
app.get("/", (req, res) => {
  res.send("Backend is running...");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/detection", detectionRoutes);
app.use("/api/notification-settings", notificationSettingsRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});