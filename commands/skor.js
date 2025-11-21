const { EmbedBuilder } = require('discord.js');
const Skor = require('../models/Skor');

module.exports.run = async (client, message, args) => {
  const user = message.mentions.users.first() || message.author;
  const oyun = args[0]?.toLowerCase(); // "adam" veya "xox"

  const skor = await Skor.findOne({ userId: user.id });

  if (!skor) {
    return message.channel.send(`${user.username} için skor kaydı yok.`);
  }

  let embed;
  if (oyun === "adam") {
    embed = new EmbedBuilder()
      .setColor(0x1E90FF)
      .setTitle(`📊 Adam Asmaca Skoru - ${user.username}`)
      .setDescription(`🏆 Kazan: ${skor.adam.kazan}\n💀 Kaybet: ${skor.adam.kaybet}`)
      .setTimestamp();
  } else if (oyun === "xox") {
    embed = new EmbedBuilder()
      .setColor(0x1E90FF)
      .setTitle(`📊 XOX Skoru - ${user.username}`)
      .setDescription(`🏆 Kazan: ${skor.xox.kazan}\n💀 Kaybet: ${skor.xox.kaybet}`)
      .setTimestamp();
  } else {
    embed = new EmbedBuilder()
      .setColor(0x1E90FF)
      .setTitle(`📊 Genel Skor - ${user.username}`)
      .setDescription(
        `🎮 Adam Asmaca → 🏆 ${skor.adam.kazan} | 💀 ${skor.adam.kaybet}\n` +
        `🎯 XOX → 🏆 ${skor.xox.kazan} | 💀 ${skor.xox.kaybet}`
      )
      .setTimestamp();
  }

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'skor', description: 'Adam Asmaca ve XOX skorlarını tek komutta gösterir.' };
