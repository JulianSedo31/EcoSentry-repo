require("dotenv").config();
const express = require("express");
const cors = require("cors");
// Import database connection
const connectDB = require("./config/db");
// Import Login Routes
const authRoutes = require("./routes/auth");

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

// Login Route
app.use("/api/auth", authRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on PORT ${PORT}`);
});
