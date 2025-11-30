const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message) => {
  let user = await User.findOne({ id: message.author.id });
  if (!user) user = new User({ id: message.author.id, wallet: 0, bank: 0 });

  // ✅ 8 saat = 28800000 ms
  const cooldown = 8 * 60 * 60 * 1000;

  if (user.lastDaily && Date.now() - user.lastDaily.getTime() < cooldown) {
    const remaining = cooldown - (Date.now() - user.lastDaily.getTime());
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Yellow")
          .setTitle("⏳ Günlük Ödül Beklemede")
          .setDescription(
            `Günlük ödülünü zaten aldın.\nTekrar alabilmek için **${hours} saat ${minutes} dakika** beklemelisin.`
          )
      ]
    });
  }

  const reward = 500;
  user.wallet += reward;
  user.lastDaily = new Date();
  await user.save();

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🎁 Günlük Ödül")
    .setDescription(
      `Bugünkü ödülünü aldın: **${reward} coin**\nYeni cüzdan: **${user.wallet}**`
    );
  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["daily", "günlük"] };
module.exports.help = { name: "günlük" };
