const mongoose = require('mongoose');
const spamLogSchema = new mongoose.Schema({
    guildId: String,
    userId: String,
    ihlalSayisi: { type: Number, default: 0 }
});
module.exports = mongoose.model('SpamLog', spamLogSchema);
