const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    messageId: String,   // Mesajı bulup düzenlemek için
    hostId: String,      // Çekilişi başlatan
    prize: String,       // Ödül
    winnerCount: Number, // Kaç kişi kazanacak
    endTime: Number,     // Bitiş zamanı (Date.now() + süre)
    participants: [String], // Katılanların ID listesi
    ended: { type: Boolean, default: false } // Bitti mi?
});

module.exports = mongoose.model('Giveaway', giveawaySchema);
