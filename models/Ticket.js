const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    // Biletin açıldığı sunucu ID'si
    guildId: { type: String, required: true }, 
    // Biletin oluşturulduğu kanal ID'si
    channelId: { type: String, required: true, unique: true }, 
    // Bileti açan kullanıcı ID'si
    userId: { type: String, required: true }, 
    // Biletin durumu (open, closed, archived)
    status: { type: String, default: 'open' },
    // Biletin açılış tarihi
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ticket', ticketSchema);
