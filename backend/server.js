require("dotenv").config();
const express = require("express");
const cors = require("cors");
// Required for fetching ESP32 data (This is needed to request data from the ESP32 device)
const fetch = require("node-fetch");
//MongoDB connection function
const connectDB = require("../backend/config/db");
// Import report routes
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON requests

// Connect to MongoDB
connectDB();

// Default/test route
app.get("/", (req, res) => {
  res.send("server is running...");
});

// ESP32 Integration: Fetch ESP32 Status
const ESP32_IP = "192.168.1.186"; // Set your ESP32 IP here

app.get("/api/esp32/status", async (req, res) => {
  try {
    const response = await fetch(`http://${ESP32_IP}/status`);
    const data = await response.json();
    res.json({ esp32: "Connected", ...data });
  } catch (error) {
    res.json({ esp32: "Disconnected", error: error.message });
  }
});

//Use report routes under /api
app.use("/api", reportRoutes); // Use report routes under/api

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
