const mongoose = require('mongoose');

const modlogSchema = new mongoose.Schema({
  guildID: String,
  logChannelID: String
});

module.exports = mongoose.model('ModLog', modlogSchema);
