const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = async (interaction) => {
  // ✅ Butona basılınca modal aç
  if (interaction.isButton() && interaction.customId.startsWith("dm_reply_")) {
    const targetId = interaction.customId.split("_")[2];

    const modal = new ModalBuilder()
      .setCustomId(`dm_modal_${targetId}`)
      .setTitle("DM Yanıtla");

    const input = new TextInputBuilder()
      .setCustomId("reply_content")
      .setLabel("Gönderilecek Mesaj")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  }

  // ✅ Modal submit → DM gönder
  if (interaction.isModalSubmit() && interaction.customId.startsWith("dm_modal_")) {
    const targetId = interaction.customId.split("_")[2];
    const replyContent = interaction.fields.getTextInputValue("reply_content");

    try {
      const user = await interaction.client.users.fetch(targetId);
      await user.send(replyContent);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Mesaj Gönderildi")
            .setDescription(`Mesaj **${user.tag}** kullanıcısına başarıyla iletildi.`)
        ],
        ephemeral: true
      });
    } catch (err) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("❌ Hata")
            .setDescription("Mesaj gönderilemedi. Kullanıcı DM kapalı olabilir.")
        ],
        ephemeral: true
      });
    }
  }
};
