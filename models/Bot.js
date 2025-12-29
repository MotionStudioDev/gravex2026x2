const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
    botId: { type: String, required: true, unique: true }, // Botun ID'si
    ownerId: { type: String, required: true }, // Bot sahibinin ID'si
    prefix: { type: String, required: true }, // Botun prefix'i
    // --- BURASI DÜZELTİLDİ: Karakter sınırı 100'den 500'e çıkarıldı ---
    shortDescription: { type: String, required: true, maxlength: 500 }, 
    longDescription: { 
        type: String, 
        required: false, 
        default: 'Uzun açıklama henüz eklenmemiştir.', 
        maxlength: 2000 // Burayı da biraz esnettim ki ileride buradan da patlama
    }, 
    inviteUrl: { type: String, required: true }, // Davet linki
    status: { type: String, default: 'Pending' }, // Pending, Approved, Denied
    addedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bot', botSchema);
