const mongoose = require('mongoose');

const TicketSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    staffRoleId: { type: String },
    categoryId: { type: String },
    logChannelId: { type: String }
});

module.exports = mongoose.model('TicketSettings', TicketSettingsSchema);
