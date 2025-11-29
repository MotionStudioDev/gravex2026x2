const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message) => {
  let user = await User.findOne({ id: message.author.id });
  if (!user) {
    user = new User({ id: message.author.id, wallet: 0, bank: 0 });
    await user.save();
  }

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle("💰 Para Bilgisi")
    .setDescription(
      `👤 Kullanıcı: **${message.author.username}**\n\n` +
      `🪙 Cüzdan: **${user.wallet} coin**\n` +
      `🏦 Banka: **${user.bank} coin**\n\n` +
      `📊 Toplam: **${user.wallet + user.bank} coin**`
    )
    .setFooter({ text: "GraveBOT Ekonomi Sistemi" });

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["param", "parabilgi"] };
module.exports.help = { name: "param" };
