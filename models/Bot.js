const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
    botId: { type: String, required: true, unique: true }, // Botun ID'si
    ownerId: { type: String, required: true }, // Bot sahibinin ID'si
    prefix: { type: String, required: true }, // Botun prefix'i
    shortDescription: { type: String, required: true, maxlength: 100 }, // Kısa açıklama
    longDescription: { 
        type: String, 
        required: false,              // ← BURAYI DEĞİŞTİRDİM: Artık zorunlu değil
        default: 'Uzun açıklama henüz eklenmemiştir.', 
        maxlength: 1000 
    }, // Uzun açıklama (opsiyonel)
    inviteUrl: { type: String, required: true }, // Davet linki
    status: { type: String, default: 'Pending' }, // Pending, Approved, Denied
    addedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bot', botSchema);
