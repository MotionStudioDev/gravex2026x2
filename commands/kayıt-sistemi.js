const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle("❌ Yetki Yok")
      .setDescription("Bu komutu sadece yöneticiler kullanabilir.")
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  const sub = args[0]?.toLowerCase();

  // Aç/Kapat
  if (!sub) {
    const embed = new EmbedBuilder()
      .setColor(0x1E90FF)
      .setTitle("📋 Kayıt Sistemi")
      .setDescription("Bu sunucu için kayıt sistemi aktif edilsin mi?")
      .setFooter({ text: "Yalnızca yöneticiler kullanabilir" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("kayıtEvet").setLabel("EVET").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("kayıtHayir").setLabel("HAYIR").setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async i => {
      if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor('Red')
          .setTitle("❌ Yetki Yok")
          .setDescription("Bu butonu sadece yöneticiler kullanabilir.")
          .setTimestamp();
        return i.reply({ embeds: [embed], ephemeral: true });
      }
      if (i.customId === "kayıtEvet") {
        await GuildSettings.findOneAndUpdate(
          { guildId: message.guild.id },
          { kayıtAktif: true },
          { upsert: true }
        );
        const aktifEmbed = new EmbedBuilder()
          .setColor('Green')
          .setTitle("✅ Kayıt Sistemi Aktif")
          .setDescription("Bu sunucu için kayıt sistemi aktif edildi.\n\n`g!kayıt-sistemi kapat` yazarak sistemi kapatabilirsin.")
          .setTimestamp();

        const komutEmbed = new EmbedBuilder()
          .setColor(0x1E90FF)
          .setTitle("📖 Kayıt Sistemi Komutları")
          .setDescription(
            "**g!kayıt-sistemi kapat** → Sistemi kapatır\n" +
            "**g!kayıt-sistemi kanal #kanal** → Kayıt kanalı ayarlar\n" +
            "**g!kayıt-sistemi roller @Kız @Erkek** → Kız & Erkek rolü ayarlar\n" +
            "**g!kayıt-sistemi yetkili @Rol** → Kayıt yetkilisi rolü ayarlar\n" +
            "**g!kayıt @Üye İsim Yaş** → Üyeyi kayıt eder (cinsiyet butonlu)"
          )
          .setFooter({ text: "Kayıt sistemi komutları" })
          .setTimestamp();

        await i.update({ embeds: [aktifEmbed, komutEmbed], components: [] });
      } else {
        const pasifEmbed = new EmbedBuilder()
          .setColor('Red')
          .setTitle("❌ Kayıt Sistemi Kurulmadı")
          .setDescription("Kayıt Sistemi bu sunucu için kurulmayacak.")
          .setTimestamp();
        await i.update({ embeds: [pasifEmbed], components: [] });
      }
    });
    return;
  }

  // diğer alt komutlar (kapat, kanal, roller, yetkili) aynı şekilde embedli kalıyor...
};
