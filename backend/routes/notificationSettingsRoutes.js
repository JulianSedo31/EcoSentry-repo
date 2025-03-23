const express = require("express");
const NotificationSettings = require("../models/NotificationSettings");

const router = express.Router();

// GET - Get notification settings
router.get("/", async (req, res) => {
  try {
    let settings = await NotificationSettings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await NotificationSettings.create({ isEnabled: true });
    }
    res.json(settings);
  } catch (error) {
    console.error("❌ Error fetching notification settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT - Update notification settings
router.put("/", async (req, res) => {
  try {
    const { isEnabled } = req.body;
    let settings = await NotificationSettings.findOne();
    
    if (!settings) {
      settings = await NotificationSettings.create({ isEnabled });
    } else {
      settings.isEnabled = isEnabled;
      settings.lastUpdated = new Date();
      await settings.save();
    }

    console.log("✅ Notification settings updated:", settings);
    res.json(settings);
  } catch (error) {
    console.error("❌ Error updating notification settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router; 