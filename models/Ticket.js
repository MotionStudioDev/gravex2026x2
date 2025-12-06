const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: { type: String, required: true }, 
    channelId: { type: String, required: true, unique: true }, 
    userId: { type: String, required: true }, 
    status: { type: String, default: 'open' },
    
    // YENİ EKLENEN ALANLAR
    topic: { type: String, default: 'Belirtilmedi' },
    description: { type: String, default: 'Belirtilmedi' },
    
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ticket', ticketSchema);
