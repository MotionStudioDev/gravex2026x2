const mongoose = require('mongoose');

const botlistSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true }, 
    logChannelId: { type: String, default: null }, // Başvuruların düşeceği kanal ID'si
});

module.exports = mongoose.model('BotlistSettings', botlistSettingsSchema);
