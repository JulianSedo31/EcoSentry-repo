const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

const ESP32_IP = "192.168.1.186"; // Set your ESP32 IP here

app.get("/esp32/status", async (req, res) => {
    try {
      const response = await fetch(`http://${ESP32_IP}/status`);
      const data = await response.json();
      res.json({ esp32: "Connected", ...data });
    } catch (error) {
      res.json({ esp32: "Disconnected", error: error.message });
    }
  });

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
