const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // ✅ Kayıt Sistemi
  kayıtAktif: { type: Boolean, default: false },
  kayıtKanal: { type: String, default: null },
  kızRol: { type: String, default: null },
  erkekRol: { type: String, default: null },
  yetkiliRol: { type: String, default: null },

  // ✅ Küfür Engel
  kufurEngel: { type: Boolean, default: false },
  kufurLog: { type: String, default: null },

  // ✅ Reklam Engel
  reklamEngel: { type: Boolean, default: false },
  reklamLog: { type: String, default: null },

  // ✅ Ses Sistemi
  sesLog: { type: String, default: null },

  // ✅ Emoji Log
  emojiLog: { type: String, default: null },

  // ✅ Otorol
  otorol: { type: String, default: null },
  otorolLog: { type: String, default: null },

  // ✅ Sayaç
  sayaçHedef: { type: Number, default: null },
  sayaçKanal: { type: String, default: null },
  // Mevcut şemanın içine bunları ekle:
spamSistemi: { type: Boolean, default: false },
spamLogKanali: { type: String, default: null },

  // ✅ Anti-Raid
  antiRaidAktif: { type: Boolean, default: false },
  antiRaidSüre: { type: Number, default: 10 },
  antiRaidEşik: { type: Number, default: 5 },
  antiRaidLog: { type: String, default: null },

  // ✅ SA-AS sistemi
  saasAktif: { type: Boolean, default: false },

  // ✅ Level Sistemi
  levelSystemActive: { type: Boolean, default: false },
  levelLog: { type: String, default: null }, // level atlama log kanalı
  levelRewardRoles: { type: Map, of: String, default: {} }, // örn: { "5":"rolId", "10":"rolId" }

  // ✅ Caps-Lock Sistemi
  capsLockEngel: { type: Boolean, default: false },
  capsLockLog: { type: String, default: null }
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
