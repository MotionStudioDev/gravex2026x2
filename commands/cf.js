const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message, args) => {
  if (!args[0]) return message.reply("⚠️ Bir miktar gir veya `all` yaz.");

  let user = await User.findOne({ id: message.author.id });
  if (!user) user = new User({ id: message.author.id, wallet: 0, bank: 0 });

  let bet;
  if (args[0].toLowerCase() === "all") {
    bet = user.wallet;
  } else {
    bet = parseInt(args[0]);
  }

  if (!bet || bet <= 0) return message.reply("⚠️ Geçerli bir miktar gir.");
  if (bet > user.wallet) return message.reply("⚠️ Cüzdanında yeterli para yok.");

  const win = Math.random() < 0.5;

  if (win) {
    user.wallet += bet;
    await user.save();
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("🎲 Coin Flip")
      .setDescription(`🎉 Kazandın! ${bet} coin eklendi.\nYeni cüzdan: **${user.wallet}**`);
    message.channel.send({ embeds: [embed] });
  } else {
    user.wallet -= bet;
    await user.save();
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("🎲 Coin Flip")
      .setDescription(`😢 Kaybettin! ${bet} coin gitti.\nYeni cüzdan: **${user.wallet}**`);
    message.channel.send({ embeds: [embed] });
  }
};

module.exports.conf = { aliases: ["cf", "coinflip"] };
module.exports.help = { name: "cf" };
