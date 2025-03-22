// routes/detectionRoutes.js
const express = require("express");
const Detection = require("../models/Detection"); // Import model

const router = express.Router();

// POST - Save detection data
router.post("/", async (req, res) => {
  try {
    const { detection } = req.body;
    if (!detection) {
      return res.status(400).json({ error: "Detection data is required" });
    }

    const newDetection = new Detection({ detection });
    await newDetection.save();

    console.log("✅ Detection saved:", newDetection); // Debugging log

    res.status(201).json({ message: "Detection stored in MongoDB", status: "success" });
  } catch (error) {
    console.error("❌ Error storing detection:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;