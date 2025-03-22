const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema({
  detection: { 
    type: String, 
    required: true,
    trim: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Add indexes for better query performance
detectionSchema.index({ timestamp: -1 });

// Add a pre-save middleware to ensure timestamp is set
detectionSchema.pre('save', function(next) {
  if (!this.timestamp) {
    this.timestamp = new Date();
  }
  next();
});

const Detection = mongoose.model("Detection", detectionSchema);

module.exports = Detection;