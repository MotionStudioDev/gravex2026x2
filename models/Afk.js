const mongoose = require('mongoose');

const afkSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    reason: { type: String, default: 'Sebep belirtilmedi' },
    timestamp: { type: Number, default: Date.now },
    oldNickname: { type: String }
});

module.exports = mongoose.model('Afk', afkSchema);
