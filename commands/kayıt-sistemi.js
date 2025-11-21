const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("❌ Bu komutu sadece yöneticiler kullanabilir.");
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
        return i.reply({ content: "❌ Bu butonu sadece yöneticiler kullanabilir.", ephemeral: true });
      }
      if (i.customId === "kayıtEvet") {
        await GuildSettings.findOneAndUpdate(
          { guildId: message.guild.id },
          { kayıtAktif: true },
          { upsert: true }
        );
        const aktifEmbed = new EmbedBuilder()
          .setColor(0x00FF7F)
          .setTitle("✅ Kayıt Sistemi Aktif")
          .setDescription("Bu sunucu için kayıt sistemi aktif edildi.\n\n`g!kayıt-sistemi kapat` yazarak sistemi kapatabilirsin.")
          .setTimestamp();
        await i.update({ embeds: [aktifEmbed], components: [] });
      } else {
        const pasifEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
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
    return message.channel.send("📴 Bu sunucu için kayıt sistemi kapatıldı.");
  }

  if (sub === "kanal") {
    const kanal = message.mentions.channels.first();
    if (!kanal) return message.reply("❌ Bir kanal etiketlemelisin.");
    await GuildSettings.findOneAndUpdate(
      { guildId: message.guild.id },
      { kayıtKanal: kanal.id },
      { upsert: true }
    );
    return message.channel.send(`✅ Kayıt kanalı <#${kanal.id}> olarak ayarlandı.`);
  }

  if (sub === "roller") {
    const kızRol = message.mentions.roles.first();
    const erkekRol = message.mentions.roles.at(1);
    if (!kızRol || !erkekRol) return message.reply("❌ İki rol etiketlemelisin (kız ve erkek).");
    await GuildSettings.findOneAndUpdate(
      { guildId: message.guild.id },
      { kızRol: kızRol.id, erkekRol: erkekRol.id },
      { upsert: true }
    );
    return message.channel.send(`✅ Kız rolü ${kızRol}, Erkek rolü ${erkekRol} olarak ayarlandı.`);
  }

  if (sub === "yetkili") {
    const rol = message.mentions.roles.first();
    if (!rol) return message.reply("❌ Bir rol etiketlemelisin.");
    await GuildSettings.findOneAndUpdate(
      { guildId: message.guild.id },
      { yetkiliRol: rol.id },
      { upsert: true }
    );
    return message.channel.send(`✅ Kayıt yetkilisi rolü ${rol} olarak ayarlandı.`);
  }
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'kayıt-sistemi', description: 'Sunucuda kayıt sistemini yönetir (aç/kapat/kanal/roller/yetkili).' };
