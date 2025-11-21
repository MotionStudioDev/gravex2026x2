const mongoose = require('mongoose');

const SkorSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  kazan: { type: Number, default: 0 },
  kaybet: { type: Number, default: 0 }
});

module.exports = mongoose.model('Skor', SkorSchema);
