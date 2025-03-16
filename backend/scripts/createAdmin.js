require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("Admin account already exists.");
      return;
    }

    const admin = new User({
      username: "admin",
      password: "adminpassword", // ❌ Remove manual hashing
      role: "admin",
    });

    await admin.save();
    console.log("✅ Admin account created successfully!");
  } catch (error) {
    console.error("❌ Error creating admin account:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
