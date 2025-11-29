const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message, args) => {
  const amount = parseInt(args[0]);
  if (!amount || amount <= 0) return message.reply("⚠️ Geçerli bir miktar gir.");

  let user = await User.findOne({ id: message.author.id });
  if (!user) return message.reply("⚠️ Önce banka hesabı oluştur (`g!banka-oluştur`).");

  if (amount > user.wallet) return message.reply("⚠️ Cüzdanında yeterli para yok.");

  user.wallet -= amount;
  user.bank += amount;
  await user.save();

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🏦 Para Yatırıldı")
    .setDescription(`Cüzdandan bankaya **${amount} coin** yatırıldı.\nCüzdan: **${user.wallet}**\nBanka: **${user.bank}**`);
  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["banka-yatır"] };
module.exports.help = { name: "banka-yatır" };
