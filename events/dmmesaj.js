const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = async (message) => {
  // ✅ Sadece DM mesajlarını yakala
  if (message.guild || message.author.bot) return;

  const guildId = "1408511083232362547";     // kendi sunucu ID'n
  const logChannelId = "1416172498923294830"; // DM loglarını görmek istediğin kanal ID'si

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
      { name: "Zaman", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
    )
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

  // ✅ Buton ekle
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dm_reply_${message.author.id}`)
      .setLabel("Mesaj Gönder")
      .setStyle(ButtonStyle.Primary)
  );

  const sent = await logChannel.send({ embeds: [embed], components: [row] });

  // Collector: butona basılınca modal aç
  const collector = sent.createMessageComponentCollector({ time: 60000 });

  collector.on("collect", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("dm_reply_")) return;

    const targetId = interaction.customId.split("_")[2];

    // Modal oluştur
    const modal = new ModalBuilder()
      .setCustomId(`dm_modal_${targetId}`)
      .setTitle("DM Yanıtla");

    const input = new TextInputBuilder()
      .setCustomId("reply_content")
      .setLabel("Gönderilecek Mesaj")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const modalRow = new ActionRowBuilder().addComponents(input);
    modal.addComponents(modalRow);

    await interaction.showModal(modal);
  });

  // Modal submit yakala
  message.client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("dm_modal_")) return;

    const targetId = interaction.customId.split("_")[2];
    const replyContent = interaction.fields.getTextInputValue("reply_content");

    try {
      const user = await message.client.users.fetch(targetId);
      await user.send(replyContent);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Mesaj Gönderildi")
            .setDescription(`Mesaj **${user.tag}** kullanıcısına başarıyla iletildi.`)
        ],
        ephemeral: true
      });
    } catch (err) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("❌ Hata")
            .setDescription("Mesaj gönderilemedi. Kullanıcı DM kapalı olabilir.")
        ],
        ephemeral: true
      });
    }
  });
};
