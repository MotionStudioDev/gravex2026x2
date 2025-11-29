const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  job: { type: String, default: null },
  lastWork: { type: Date, default: null }
});

module.exports = mongoose.model("User", userSchema);
