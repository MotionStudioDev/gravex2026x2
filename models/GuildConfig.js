const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  kayıtAktif: { type: Boolean, default: false },
  kayıtKanal: { type: String, default: null },
  kızRol: { type: String, default: null },
  erkekRol: { type: String, default: null },
  yetkiliRol: { type: String, default: null }
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
