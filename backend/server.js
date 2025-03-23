require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http'); // Import HTTP module
const { Server } = require('socket.io'); // Import Socket.IO
const detectionRoutes = require('./routes/detectionRoutes');
const authRoutes = require("./routes/auth");
const Detection = require('./models/Detection'); // Import Detection Model

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow any frontend to connect
    methods: ["GET", "POST"],
  },
});

const emitChainsawDetection = (data) => {
  io.emit("chainsawDetected", data);
};

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/detections', detectionRoutes);
app.use("/api/auth", authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// MongoDB connection
console.log('🔄 Connecting to MongoDB...');
console.log('🔑 Using URI:', process.env.MONGO_URI ? 'URI is set' : 'No URI found');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');

  // Add a test detection if none exist
  Detection.countDocuments().then(count => {
    if (count === 0) {
      console.log('📝 Adding test detection...');
      const testDetection = new Detection({
        detection: 'Test Chainsaw Detection',
        timestamp: new Date()
      });
      testDetection.save()
        .then(() => console.log('✅ Test detection added successfully'))
        .catch(err => console.error('❌ Error adding test detection:', err));
    } else {
      console.log(`📊 Current detections count: ${count}`);
    }
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });

  socket.on("error", (err) => {
    console.error("❌ WebSocket error:", err);
  });
});

// Modify detection route to emit real-time events
app.post("/api/detections", async (req, res) => {
  try {
    const { detection } = req.body;
    if (!detection) return res.status(400).json({ error: "Detection data required" });

    const detectionData = {
      detection,
      timestamp: new Date(),
    };

    await Detection.create(detectionData);

    // Emit detection alert to all clients
    io.emit("chainsawDetected", detectionData);

    res.json({ message: "Detection stored and emitted in real-time", status: "success" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Detections API available at http://localhost:${PORT}/api/detections`);
});