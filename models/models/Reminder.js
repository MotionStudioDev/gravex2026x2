const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  message: String,
  remindAt: Date,
  status: { type: String, default: 'active' } // active / deleted
});

module.exports = mongoose.model('Reminder', reminderSchema);
