const mongoose = require("mongoose"); // Import Mongoose to interact with MongoDB

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB using the URI from the environment variables
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected"); // Log success message if connected
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error); // Log error if connection fails
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

module.exports = connectDB; // Export the function so it can be used in other files
