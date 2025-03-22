const express = require("express");
const Detection = require("../models/Detection"); // Import the model
const router = express.Router();

router.post("/", async (req, res) => {
    const { detection } = req.body;

    if (!detection) {
        return res.status(400).json({ error: "Detection data is required." });
    }

    try {
        // Save to MongoDB
        const newDetection = new Detection({ detection });
        await newDetection.save();

        console.log("🔴 Chainsaw Detection Stored:", detection);
        res.json({ message: "Detection stored in MongoDB", status: "success" });
    } catch (err) {
        console.error("❌ Error saving detection:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch all detections
router.get("/", async (req, res) => {
    try {
        const detections = await Detection.find().sort({ timestamp: -1 }); // Get latest first
        res.json(detections);
    } catch (err) {
        console.error("❌ Error fetching detections:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;