const mongoose = require('mongoose');

const GiveawaySchema = new mongoose.Schema({
    messageId: String,
    channelId: String,
    guildId: String,
    prize: String,
    winnerCount: Number,
    endTime: Number,
    hostedBy: String,
    participants: { type: Array, default: [] },
    ended: { type: Boolean, default: false }
});

module.exports = mongoose.model('Giveaway', GiveawaySchema);
