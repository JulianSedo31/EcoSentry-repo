const express = require("express");
const Detection = require("../models/Detection"); // Import model
const mongoose = require("mongoose");

const router = express.Router();

// GET - Fetch all detections from the detections table
router.get("/", async (req, res) => {
  try {
    console.log("📥 Fetching detections from database...");
    
    // Log the MongoDB connection state
    const dbState = mongoose.connection.readyState;
    console.log("🔌 MongoDB connection state:", dbState);
    
    const detections = await Detection.find().sort({ timestamp: -1 });
    console.log(`✅ Found ${detections.length} detections`);
    
    if (detections.length === 0) {
      console.log("ℹ️ No detections found in database");
      return res.json([]);
    }
    
    // Transform the data to ensure timestamps are properly formatted
    const formattedDetections = detections.map(detection => {
      console.log("🔍 Processing detection:", detection);
      return {
        ...detection.toObject(),
        timestamp: detection.timestamp.toISOString()
      };
    });
    
    console.log("✨ Sending formatted detections:", JSON.stringify(formattedDetections, null, 2));
    res.json(formattedDetections);
  } catch (error) {
    console.error("❌ Error fetching detections:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST - Save detection data to the detections table
router.post("/", async (req, res) => {
  try {
    const { detection } = req.body;
    console.log("📝 Received detection data:", req.body);
    
    if (!detection) {
      console.log("❌ No detection data provided");
      return res.status(400).json({ error: "Detection data is required" });
    }

    console.log("📝 Creating new detection:", detection);
    const newDetection = new Detection({ 
      detection,
      timestamp: new Date() // Explicitly set the timestamp
    });
    
    console.log("💾 Saving detection to database...");
    await newDetection.save();
    console.log("✅ Detection saved successfully:", newDetection);

    res.status(201).json({ 
      message: "Detection stored in MongoDB", 
      status: "success",
      detection: {
        ...newDetection.toObject(),
        timestamp: newDetection.timestamp.toISOString()
      }
    });
  } catch (error) {
    console.error("❌ Error storing detection:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST - Handle chainsaw detection (real-time detection endpoint)
router.post("/chainsaw", async (req, res) => {
  try {
    const { detection } = req.body;
    console.log(`🚨 Chainsaw Detected! Data Received:`, req.body);
    
    // Save the detection to the database with explicit timestamp
    const newDetection = new Detection({ 
      detection,
      timestamp: new Date() // Explicitly set the timestamp
    });
    
    console.log("💾 Saving chainsaw detection to database...");
    await newDetection.save();
    console.log("✅ Chainsaw detection saved successfully");
    
    // Respond to the detection script
    res.json({ 
      message: "Detection received and saved", 
      status: "success",
      detection: {
        ...newDetection.toObject(),
        timestamp: newDetection.timestamp.toISOString()
      }
    });
  } catch (error) {
    console.error("❌ Error saving chainsaw detection:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;