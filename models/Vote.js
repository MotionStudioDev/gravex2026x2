const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({
  userId: String,
  username: String,
  votedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Vote", voteSchema);
