const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message) => {
  // En çok parası olan ilk 10 kullanıcı
  const topUsers = await User.find().sort({ wallet: -1 }).limit(10);

  if (!topUsers.length) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Red").setDescription("⚠️ Henüz kimsenin parası yok.")]
    });
  }

  let desc = "";
  topUsers.forEach((u, i) => {
    const member = message.guild.members.cache.get(u.id);
    const name = member ? member.user.username : u.id;
    desc += `**${i + 1}.** ${name} → 💰 ${u.wallet} coin\n`;
  });

  const embed = new EmbedBuilder()
    .setColor("Gold")
    .setTitle("🏆 Para Sıralaması")
    .setDescription(desc)
    .setFooter({ text: "İlk 10 zengin üye" });

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["leaderboard", "lb", "para-sıralama"] };
module.exports.help = { name: "para-sıralama" };
