const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message) => {
  let user = await User.findOne({ id: message.author.id });
  if (!user || !user.job) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Red").setDescription("⚠️ Şu anda bir mesleğin yok.")]
    });
  }

  const oldJob = user.job;
  user.job = null;
  await user.save();

  const embed = new EmbedBuilder()
    .setColor("Orange")
    .setTitle("🚪 Meslekten Ayrıldın")
    .setDescription(`Artık **${oldJob}** olarak çalışmıyorsun.`);
  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["meslek-ayrıl"] };
module.exports.help = { name: "meslek-ayrıl" };
