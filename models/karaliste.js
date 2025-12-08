const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
    // Sunucu ID'si (Discord sunucularının benzersiz kimliği)
    guildID: {
        type: String,
        required: true,
        unique: true
    },
    // Kara listeye alma sebebi
    reason: {
        type: String,
        default: 'Belirtilmemiş bir sebepten ötürü bot kullanımı yasaklanmıştır.'
    },
    // Kara listeye alma tarihi
    dateAdded: {
        type: Date,
        default: Date.now
    },
    // İşlemi yapan yetkili (isteğe bağlı)
    operator: {
        type: String, 
        default: 'Bilinmiyor'
    }
});

module.exports = mongoose.model('Blacklist', blacklistSchema);
