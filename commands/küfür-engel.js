const { EmbedBuilder } = require('discord.js');
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
          .setTitle('ℹ️ Küfür Engel Komutu')
          .setDescription('Kullanım:\n`g!küfür-engel aç`\n`g!küfür-engel kapat`\n`g!küfür-engel durum`\n`g!küfür-engel log <#kanal>`')
      ]
    });
  }

  // Sunucu ayarını bul veya oluştur
  let settings = await GuildSettings.findOne({ guildId });
  if (!settings) {
    settings = new GuildSettings({ guildId });
  }

  if (sub === 'aç') {
    settings.kufurEngel = true;
    await settings.save();
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Küfür Engel Aktif Edildi')
          .setDescription('Küfür engel sistemi artık aktif.')
      ]
    });
  }

  if (sub === 'kapat') {
    settings.kufurEngel = false;
    settings.kufurLog = null;
    await settings.save();
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Küfür Engel Devre Dışı')
          .setDescription('Küfür engel sistemi kapatıldı.')
      ]
    });
  }

  if (sub === 'durum') {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('🔍 Küfür Engel Durumu')
          .addFields(
            { name: 'Durum', value: settings.kufurEngel ? 'Aktif' : 'Pasif', inline: true },
            { name: 'Log Kanalı', value: settings.kufurLog ? `<#${settings.kufurLog}>` : 'Ayarlanmamış', inline: true }
          )
      ]
    });
  }

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

    settings.kufurLog = kanal.id;
    await settings.save();
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Log Kanalı Ayarlandı')
          .setDescription(`Küfür logları artık <#${kanal.id}> kanalına gönderilecek.`)
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['küfürengel']
};

module.exports.help = {
  name: 'küfür-engel'
};
