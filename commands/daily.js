const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message) => {
  let user = await User.findOne({ id: message.author.id });
  if (!user) user = new User({ id: message.author.id, wallet: 0, bank: 0 });

  if (user.lastDaily && Date.now() - user.lastDaily.getTime() < 86400000) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Yellow").setDescription("⏳ Günlük ödülünü zaten aldın, yarın tekrar dene.")]
    });
  }

  const reward = 500;
  user.wallet += reward;
  user.lastDaily = new Date();
  await user.save();

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🎁 Günlük Ödül")
    .setDescription(`Bugünkü ödülünü aldın: **${reward} coin**\nYeni cüzdan: **${user.wallet}**`);
  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["daily", "günlük"] };
module.exports.help = { name: "günlük" };
