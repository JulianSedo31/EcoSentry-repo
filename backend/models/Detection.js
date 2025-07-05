//models/Detection.js
const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema({
  detection: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }, // Add timestamp with default value
  file_id: { type: String }, // Add file_id field to store GridFS file reference
  device: { type: String },
  location: { type: String },
  isArchived: { type: Boolean, default: false }, // Add archiving field
  archivedAt: { type: Date }, // Track when it was archived
  archivedBy: { type: String }, // Track who archived it (optional)
});

const Detection = mongoose.model("Detection", detectionSchema);
module.exports = Detection;
