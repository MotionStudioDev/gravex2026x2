const { EmbedBuilder } = require("discord.js");

module.exports.run = async (client, message, args) => {
  const member =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.member;

  if (!member) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("🚫 Kullanıcı Bulunamadı")
          .setDescription("Belirttiğin kullanıcı bu sunucuda bulunamadı.")
      ]
    });
  }

  const user = member.user;
  const avatar = user.displayAvatarURL({ dynamic: true, size: 1024 });
  const banner = user.bannerURL({ dynamic: true, size: 1024 }) || "Yok";
  const nickname = member.nickname || "Yok";
  const joined = member.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
    : "Bilinmiyor";

  // ✅ Roller
  const roles = member.roles.cache
    .filter(r => r.id !== message.guild.id)
    .map(r => r.toString())
    .join(", ") || "Yok";

  // ✅ Durum (presence)
  const statusMap = {
    online: "🟢 Çevrim içi",
    idle: "🌙 Boşta",
    dnd: "⛔ Rahatsız Etmeyin",
    offline: "⚫ Çevrim dışı"
  };
  const presence = member.presence?.status || "offline";
  const durum = statusMap[presence];

  // ✅ Boost bilgisi
  const boosting = member.premiumSince
    ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:F>`
    : "Boost yok";

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(`👤 ${user.username} kullanıcısının profili`)
    .setThumbnail(avatar)
    .addFields(
      { name: "🆔 Kullanıcı ID", value: user.id, inline: true },
      {
        name: "📅 Hesap Oluşturulma",
        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
        inline: true
      },
      { name: "📅 Sunucuya Katılım", value: joined, inline: true },
      { name: "🎭 Kullanıcı Adı", value: user.tag, inline: true },
      { name: "🏷️ Sunucu Takma Adı", value: nickname, inline: true },
      { name: "🎨 Avatar", value: `[Tıkla](${avatar})`, inline: true },
      { name: "🖼️ Banner", value: banner === "Yok" ? "Yok" : `[Tıkla](${banner})`, inline: true },
      { name: "📌 Roller", value: roles, inline: false },
      { name: "💻 Durum", value: durum, inline: true },
      { name: "🚀 Boost", value: boosting, inline: true }
    )
    .setFooter({ text: "Profil bilgileri gösterildi." })
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = {
  aliases: ["kullanıcı", "user", "info"]
};

module.exports.help = {
  name: "profil",
  description: "Belirtilen kullanıcının profil bilgilerini detaylı şekilde gösterir."
};
