const mongoose = require('mongoose');

const lastSeenSchema = new mongoose.Schema({
    // Sunucu ID'si
    guildID: {
        type: String,
        required: true,
    },
    // Kullanıcı ID'si
    userID: {
        type: String,
        required: true,
    },
    // Son Sunucuya Giriş Zamanı (Timestamp)
    lastJoin: {
        type: Number,
        default: Date.now,
    },
    // Son Sunucudan Çıkış Zamanı (Timestamp)
    lastLeave: {
        type: Number,
        default: 0, // Başlangıçta 0 veya null olabilir
    },
    // Sunucuda geçirilen toplam süre (milisaniye cinsinden)
    totalActiveDuration: {
        type: Number,
        default: 0,
    }
});

module.exports = mongoose.model('LastSeen', lastSeenSchema);
