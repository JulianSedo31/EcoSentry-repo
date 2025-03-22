const mongoose = require("mongoose");

const DetectionSchema = new mongoose.Schema({
  detection: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Detection", DetectionSchema);