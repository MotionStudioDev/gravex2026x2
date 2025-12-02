const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = async (message) => {
  if (message.guild || message.author.bot) return;

  const guildId = "1408511083232362547";     // kendi sunucu ID'n
  const logChannelId = "1416172498923294830"; // DM loglarını görmek istediğin kanal ID'si

  const guild = message.client.guilds.cache.get(guildId);
  if (!guild) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle("📩 Yeni DM Mesajı")
    .addFields(
      { name: "Gönderen", value: `${message.author.tag} (${message.author.id})` },
      { name: "Mesaj İçeriği", value: `\`\`\`${message.content}\`\`\`` },
      { name: "Zaman", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
    )
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dm_reply_${message.author.id}`)
      .setLabel("Mesaj Gönder")
      .setStyle(ButtonStyle.Primary)
  );

  await logChannel.send({ embeds: [embed], components: [row] });
};
