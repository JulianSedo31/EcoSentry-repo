const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
  isEnabled: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema); 