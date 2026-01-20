const mongoose = require('mongoose');

const spamLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    ihlalSayisi: { type: Number, default: 0 },
    sonIhlal: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SpamLog', spamLogSchema);
