const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    messageId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    guildId: { type: String, required: true },
    prize: { type: String, required: true },
    winnerCount: { type: Number, default: 1 },
    endTime: { type: Number, required: true }, // Milisaniye cinsinden bitiş zamanı
    participants: { type: [String], default: [] }, // Katılanların ID listesi
    ended: { type: Boolean, default: false },
    hostedBy: { type: String, required: true }
});

module.exports = mongoose.model('Giveaway', giveawaySchema);
