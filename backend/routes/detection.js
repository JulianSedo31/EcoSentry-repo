const express = require("express");
const router = express.Router();

// Route to handle chainsaw detection
router.post("/", (req, res) => {
  const { detection } = req.body;
  console.log(`🚨 Chainsaw Detected! Data Received: ${detection}`);
  
  // Respond to the detection script
  res.json({ message: "Detection received", status: "success" });
});

module.exports = router;