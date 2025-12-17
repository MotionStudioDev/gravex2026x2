const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    userId: String,
    topic: String,
    description: String,
    status: { type: String, default: 'open' }, // open, closed
    createdAt: { type: Date, default: Date.now },
    closedAt: Date
});

module.exports = mongoose.model('Ticket', TicketSchema);
