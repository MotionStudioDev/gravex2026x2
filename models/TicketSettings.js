const mongoose = require('mongoose');

const TicketSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    staffRoleId: { type: String },
    categoryId: { type: String },
    logChannelId: { type: String, default: null }});

module.exports = mongoose.model('TicketSettings', TicketSettingsSchema);
