//models/Detection.js
const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema({
  detection: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }, // Add timestamp with default value
  file_id: { type: String } // Add file_id field to store GridFS file reference
});

const Detection = mongoose.model("Detection", detectionSchema);
module.exports = Detection;