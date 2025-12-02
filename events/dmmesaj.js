const { EmbedBuilder } = require("discord.js");

// DM mesajlarını yakala ve belirli bir kanala gönder
module.exports = async (message) => {
  // ✅ Sadece DM mesajlarını yakala
  if (message.guild || message.author.bot) return;

  // Hedef sunucu ve kanal ID'lerini sabit tutabilirsin
  const guildId = "SUNUCU_ID";       // kendi sunucu ID'n
  const logChannelId = "KANAL_ID";   // DM loglarını görmek istediğin kanal ID'si

  const guild = message.client.guilds.cache.get(guildId);
  if (!guild) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  // ✅ Embed oluştur
  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle("📩 Yeni DM Mesajı")
    .addFields(
      { name: "Gönderen", value: `${message.author.tag} (${message.author.id})` },
      { name: "Mesaj İçeriği", value: `\`\`\`${message.content}\`\`\`` },
      { name: "Zaman", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
    )
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

  logChannel.send({ embeds: [embed] });
};
