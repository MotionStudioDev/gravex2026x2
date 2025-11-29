const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message) => {
  let user = await User.findOne({ id: message.author.id });
  if (!user || !user.job) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Red").setDescription("⚠️ Önce bir meslek seç (`g!meslek`).")]
    });
  }

  // cooldown: 1 saat
  if (user.lastWork && Date.now() - user.lastWork.getTime() < 3600000) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Yellow").setDescription("⏳ Çalışmak için biraz bekle! (1 saat cooldown)")]
    });
  }

  const earned = Math.floor(Math.random() * 500) + 100; // 100-600 arası kazanç
  user.wallet += earned;
  user.lastWork = new Date();
  await user.save();

  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("💼 Çalıştın")
    .setDescription(`**${user.job}** olarak çalıştın ve **${earned} coin** kazandın!\nYeni cüzdan: **${user.wallet}**`);
  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["çalış"] };
module.exports.help = { name: "çalış" };
