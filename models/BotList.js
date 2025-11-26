const mongoose = require('mongoose');

const botListSchema = new mongoose.Schema({
  guildId: { type: String, index: true },
  active: { type: Boolean, default: false },
  settings: {
    logChannelId: String,       // Onay/Red log kanalı
    submitChannelId: String,    // Üyelerin bot eklediği kanal
    botRoleId: String,          // (opsiyonel)
    developerRoleId: String,    // (opsiyonel)
    staffRoleId: String,        // Onay yetkilisi rol
    botInviteLimit: { type: Number, default: 1 }
  },
  pending: [{
    botId: String,
    ownerId: String,
    prefix: String,
    desc: String,
    createdAt: { type: Date, default: Date.now }
  }],
  approved: [{
    botId: String,
    ownerId: String,
    prefix: String,
    desc: String,
    approvedAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('BotList', botListSchema);
