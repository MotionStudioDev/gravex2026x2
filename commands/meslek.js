const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

const jobs = ["Doktor", "Polis", "Mühendis", "Şoför", "Kasiyer"];

module.exports.run = async (client, message, args) => {
  const job = args[0];
  if (!job || !jobs.includes(job)) {
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor("Yellow")
        .setTitle("📋 Meslek Listesi")
        .setDescription(jobs.map(j => `• ${j}`).join("\n"))]
    });
  }

  let user = await User.findOne({ id: message.author.id });
  if (!user) user = new User({ id: message.author.id });

  if (user.job) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Red").setDescription("⚠️ Zaten bir mesleğin var!")]
    });
  }

  user.job = job;
  await user.save();

  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("✅ Meslek Seçildi")
    .setDescription(`Artık **${job}** olarak çalışıyorsun!`);
  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["meslek"] };
module.exports.help = { name: "meslek" };
