const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");

module.exports.run = async (client, message, args) => {
  const channel = message.channel;

  // İlk embed: kilitleniyor
  const embed = new EmbedBuilder()
    .setColor("#FFA500")
    .setTitle("🔒 Kanal Kilitleniyor...")
    .setDescription("Lütfen bekleyin.")
    .setTimestamp();

  const msg = await message.reply({ embeds: [embed] });

  // Kanalı kilitle (herkese mesaj gönderme kapalı)
  await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
    SendMessages: false
  });

  // Kilidi kaldır butonu
  const button = new ButtonBuilder()
    .setCustomId("unlock")
    .setLabel("Kilidi Kaldır")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(button);

  // Embed güncelle
  const lockedEmbed = new EmbedBuilder()
    .setColor("#00FF00")
    .setTitle("✅ Kanal Kilitlendi!")
    .setDescription("Kilidi Kaldırmak için aşağıdaki butona tıkla!")
    .setTimestamp();

  await msg.edit({ embeds: [lockedEmbed], components: [row] });

  // Buton interaction
  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "unlock") {
      // Kanalı aç
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: true
      });

      const unlockedEmbed = new EmbedBuilder()
        .setColor("#3498DB")
        .setTitle("🔓 Kanal Kilidi Kaldırıldı!")
        .setDescription("Kanal artık mesajlara açık.")
        .setTimestamp();

      await interaction.update({ embeds: [unlockedEmbed], components: [] });
    }
  });
};

module.exports.conf = {
  aliases: ["kilit", "unlock"]
};

module.exports.help = {
  name: "lock"
};
