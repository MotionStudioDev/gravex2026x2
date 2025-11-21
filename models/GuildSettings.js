const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  kufurEngel: { type: Boolean, default: false },
  kufurLog: { type: String, default: null },
  reklamEngel: { type: Boolean, default: false },
  reklamLog: { type: String, default: null },
  sesLog: { type: String, default: null },
  emojiLog: { type: String, default: null } // ✅ Emoji log kanalı
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
