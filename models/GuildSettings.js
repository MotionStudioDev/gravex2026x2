const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // Küfür Engel
  kufurEngel: { type: Boolean, default: false },
  kufurLog: { type: String, default: null },

  // Reklam Engel
  reklamEngel: { type: Boolean, default: false },
  reklamLog: { type: String, default: null },

  // Ses Sistemi
  sesLog: { type: String, default: null },

  // Emoji Log
  emojiLog: { type: String, default: null },

  // Otorol
  otorol: { type: String, default: null },
  otorolLog: { type: String, default: null },

  // Sayaç
  sayaçHedef: { type: Number, default: null },
  sayaçKanal: { type: String, default: null },

  // Anti-Raid
  antiRaidAktif: { type: Boolean, default: false },
  antiRaidSüre: { type: Number, default: 10 },   // saniye
  antiRaidEşik: { type: Number, default: 5 },
  antiRaidLog: { type: String, default: null }
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
