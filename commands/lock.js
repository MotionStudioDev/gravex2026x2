const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

module.exports.run = async (client, message, args) => {
  const channel = message.channel;
  const commandName = message.content.split(" ")[0].replace(/^g!/, "").toLowerCase();

  if (commandName === "unlock") {
    // Kanal zaten açık mı kontrol et
    const perms = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
    const isLocked = perms?.deny?.has(PermissionsBitField.Flags.SendMessages);

    if (!isLocked) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("❌ Kanal zaten açık!")
            .setDescription("Bu kanal kilitli değil, kilidi kaldırmaya gerek yok.")
        ]
      });
    }

    // Kilidi kaldır
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: true
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#3498DB")
          .setTitle("🔓 Kanal Kilidi Kaldırıldı!")
          .setDescription("Kanal artık mesajlara açık.")
          .setTimestamp()
      ]
    });
  }

  // g!lock komutu → kilitleme işlemi
  const embed = new EmbedBuilder()
    .setColor("#FFA500")
    .setTitle("🔒 Kanal Kilitleniyor...")
    .setDescription("Lütfen bekleyin.")
    .setTimestamp();

  const msg = await message.reply({ embeds: [embed] });

  await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
    SendMessages: false
  });

  const button = new ButtonBuilder()
    .setCustomId("unlock")
    .setLabel("Kilidi Kaldır")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(button);

  const lockedEmbed = new EmbedBuilder()
    .setColor("#00FF00")
    .setTitle("✅ Kanal Kilitlendi!")
    .setDescription("Kilidi Kaldırmak için aşağıdaki butona tıkla!")
    .setTimestamp();

  await msg.edit({ embeds: [lockedEmbed], components: [row] });
};

module.exports.conf = {
  aliases: ["kilit", "unlock"]
};

module.exports.help = {
  name: "lock"
};
