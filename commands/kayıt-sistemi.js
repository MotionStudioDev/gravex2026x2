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

  if (sub === "kapat") {
    await GuildSettings.findOneAndUpdate(
      { guildId: message.guild.id },
      { kayıtAktif: false },
      { upsert: true }
    );
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle("📴 Kayıt Sistemi Kapatıldı")
      .setDescription("Bu sunucu için kayıt sistemi kapatıldı.")
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  if (sub === "kanal") {
    const kanal = message.mentions.channels.first();
    if (!kanal) {
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle("❌ Hatalı Kullanım")
        .setDescription("Bir kanal etiketlemelisin.")
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }
    await GuildSettings.findOneAndUpdate(
      { guildId: message.guild.id },
      { kayıtKanal: kanal.id },
      { upsert: true }
    );
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle("✅ Kayıt Kanalı Ayarlandı")
      .setDescription(`Kayıt kanalı <#${kanal.id}> olarak ayarlandı.`)
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  if (sub === "roller") {
    const kızRol = message.mentions.roles.first();
    const erkekRol = message.mentions.roles.at(1);
    if (!kızRol || !erkekRol) {
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle("❌ Hatalı Kullanım")
        .setDescription("İki rol etiketlemelisin (kız ve erkek).")
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }
    await GuildSettings.findOneAndUpdate(
      { guildId: message.guild.id },
      { kızRol: kızRol.id, erkekRol: erkekRol.id },
      { upsert: true }
    );
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle("✅ Roller Ayarlandı")
      .setDescription(`Kız rolü ${kızRol}, Erkek rolü ${erkekRol} olarak ayarlandı.`)
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  if (sub === "yetkili") {
    const rol = message.mentions.roles.first();
    if (!rol) {
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle("❌ Hatalı Kullanım")
        .setDescription("Bir rol etiketlemelisin.")
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }
    await GuildSettings.findOneAndUpdate(
      { guildId: message.guild.id },
      { yetkiliRol: rol.id },
      { upsert: true }
    );
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle("✅ Yetkili Rol Ayarlandı")
      .setDescription(`Kayıt yetkilisi rolü ${rol} olarak ayarlandı.`)
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }
};

module.exports.conf = { aliases: [] };
module.exports.help = { 
  name: 'kayıt-sistemi', 
  description: 'Sunucuda kayıt sistemini yönetir (aç/kapat/kanal/roller/yetkili).' 
};
