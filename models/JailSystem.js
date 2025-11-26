const mongoose = require('mongoose');

const jailSchema = new mongoose.Schema({
  guildId: String,
  active: { type: Boolean, default: false },
  settings: {
    logChannelId: String,
    staffRoleId: String,
    jailRoleId: String
  },
  jailed: [{
    userId: String,
    jailedAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('JailSystem', jailSchema);
