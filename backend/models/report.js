const mongoose = require("mongoose");

// Define the schema (structure) of a report
const ReportSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true, // The type of alert (e.g., "Illegal Logging")
  },
  location: {
    lat: { type: Number, required: true }, // Latitude of the alert
    lng: { type: Number, required: true }, // Longitude of the alert
  },
  timestamp: {
    type: Date,
    default: Date.now, // Automatically store the current date/time
  },
});

// Create a model from the schema (this will be used to interact with MongoDB)
const Report = mongoose.model("Report", ReportSchema);

module.exports = Report;
