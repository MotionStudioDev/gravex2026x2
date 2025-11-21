const { EmbedBuilder, ChannelType } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has('Administrator')) {
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
          .setTitle('ℹ️ Reklam Engel Komutu')
          .setDescription('Kullanım:\n`g!reklam-engel aç`\n`g!reklam-engel kapat`\n`g!reklam-engel durum`\n`g!reklam-engel log <#kanal>`')
      ]
    });
  }

  // Sunucu ayarını bul veya oluştur
  let settings = await GuildSettings.findOne({ guildId });
  if (!settings) {
    settings = new GuildSettings({ guildId });
  }

  if (sub === 'aç') {
    settings.reklamEngel = true;
    await settings.save();
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Reklam Engel Açıldı')
          .setDescription('Artık reklam içeren mesajlar silinecek.')
      ]
    });
  }

  if (sub === 'kapat') {
    settings.reklamEngel = false;
    settings.reklamLog = null;
    await settings.save();
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Reklam Engel Kapatıldı')
          .setDescription('Reklam engelleme sistemi devre dışı bırakıldı.')
      ]
    });
  }

  if (sub === 'durum') {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('🔍 Reklam Engel Durumu')
          .addFields(
            { name: 'Durum', value: settings.reklamEngel ? 'Aktif' : 'Pasif', inline: true },
            { name: 'Log Kanalı', value: settings.reklamLog ? `<#${settings.reklamLog}>` : 'Ayarlanmamış', inline: true }
          )
      ]
    });
  }

  if (sub === 'log') {
    const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
    if (!kanal || kanal.type !== ChannelType.GuildText) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Geçersiz Kanal')
            .setDescription('Lütfen geçerli bir metin kanalı etiketle veya ID gir.')
        ]
      });
    }

    settings.reklamLog = kanal.id;
    await settings.save();
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Log Kanalı Ayarlandı')
          .setDescription(`Reklam logları artık <#${kanal.id}> kanalına gönderilecek.`)
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['reklamengel']
};

module.exports.help = {
  name: 'reklam-engel'
};
