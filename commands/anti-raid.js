const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Yetki Yok')
          .setDescription('Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.')
      ]
    });
  }

  const sub = args[0]?.toLowerCase();
  const guildId = message.guild.id;

  if (!sub || !['aç', 'kapat', 'durum', 'log'].includes(sub)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Orange')
          .setTitle('ℹ️ Anti-Raid Komutu')
          .setDescription(
            "Kullanım:\n" +
            "`g!anti-raid aç <eşik> <saniye>`\n" +
            "`g!anti-raid kapat`\n" +
            "`g!anti-raid durum`\n" +
            "`g!anti-raid log <#kanal>`"
          )
      ]
    });
  }

  // ✅ Aç
  if (sub === 'aç') {
    const eşik = parseInt(args[1]);
    const süre = parseInt(args[2]);

    if (!eşik || !süre || eşik < 2 || süre < 5) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Geçersiz Parametre')
            .setDescription('Kullanım: `g!anti-raid aç <eşik> <saniye>`\nÖrnek: `g!anti-raid aç 5 10`')
        ]
      });
    }

    await GuildSettings.findOneAndUpdate(
      { guildId },
      { antiRaidAktif: true, antiRaidEşik: eşik, antiRaidSüre: süre },
      { upsert: true }
    );

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Anti-Raid Aktif Edildi')
          .setDescription(`Süre: **${süre}sn**, Eşik: **${eşik} kişi**`)
      ]
    });
  }

  // ✅ Kapat
  if (sub === 'kapat') {
    await GuildSettings.findOneAndUpdate(
      { guildId },
      { antiRaidAktif: false, antiRaidEşik: null, antiRaidSüre: null, antiRaidLog: null }
    );
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Anti-Raid Devre Dışı')
          .setDescription('Sistem kapatıldı.')
      ]
    });
  }

  // ✅ Durum
  if (sub === 'durum') {
    const settings = await GuildSettings.findOne({ guildId });
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('🔍 Anti-Raid Durumu')
          .addFields(
            { name: 'Durum', value: settings?.antiRaidAktif ? 'Aktif' : 'Pasif', inline: true },
            { name: 'Eşik', value: settings?.antiRaidEşik?.toString() || '-', inline: true },
            { name: 'Süre', value: settings?.antiRaidSüre ? settings.antiRaidSüre + 'sn' : '-', inline: true },
            { name: 'Log Kanalı', value: settings?.antiRaidLog ? `<#${settings.antiRaidLog}>` : 'Ayarlanmamış', inline: false }
          )
      ]
    });
  }

  // ✅ Log Kanalı
  if (sub === 'log') {
    const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
    if (!kanal || kanal.type !== 0) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Geçersiz Kanal')
            .setDescription('Lütfen geçerli bir metin kanalı etiketle veya ID gir.')
        ]
      });
    }

    await GuildSettings.findOneAndUpdate(
      { guildId },
      { antiRaidLog: kanal.id },
      { upsert: true }
    );

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Log Kanalı Ayarlandı')
          .setDescription(`Raid logları artık <#${kanal.id}> kanalına gönderilecek.`)
      ]
    });
  }
};

module.exports.conf = { aliases: ['antiraid'] };
module.exports.help = { name: 'anti-raid', description: 'Sunucuda anti-raid sistemini yönetir.' };
