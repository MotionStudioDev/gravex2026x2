const mongoose = require('mongoose');

const uyeEtiketSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    channelId: {
        type: String,
        required: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    deleteAfter: {
        type: Number,
        default: 3000 // 3 saniye (milisaniye cinsinden)
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Her güncellemede updatedAt'i güncelle
uyeEtiketSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('UyeEtiket', uyeEtiketSchema);
