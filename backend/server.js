require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const detectionRoutes = require('./routes/detectionRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/detections', detectionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// MongoDB connection
console.log('🔄 Connecting to MongoDB...');
console.log('🔑 Using URI:', process.env.MONGO_URI ? 'URI is set' : 'No URI found');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  // Add a test detection if none exist
  const Detection = require('./models/Detection');
  Detection.countDocuments().then(count => {
    if (count === 0) {
      console.log('📝 Adding test detection...');
      const testDetection = new Detection({
        detection: 'Test Chainsaw Detection',
        timestamp: new Date()
      });
      testDetection.save()
        .then(() => console.log('✅ Test detection added successfully'))
        .catch(err => console.error('❌ Error adding test detection:', err));
    } else {
      console.log(`📊 Current detections count: ${count}`);
    }
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Error details:', {
    name: err.name,
    message: err.message,
    code: err.code
  });
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Detections API available at http://localhost:${PORT}/api/detections`);
}); 