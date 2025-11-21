const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has('Administrator')) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Yetki Yok')
          .setDescription('Bu komutu sadece `Yönetici` yetkisine sahip kişiler kullanabilir.')
      ]
    });
  }

  const sub = args[0]?.toLowerCase();
  const guildId = message.guild.id;

  let settings = await GuildSettings.findOne({ guildId });
  if (!settings) settings = new GuildSettings({ guildId });

  if (!sub || !['aç', 'kapat', 'durum'].includes(sub)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Orange')
          .setTitle('ℹ️ SA-AS Komutu')
          .setDescription('Kullanım:\n`g!sa-as aç`\n`g!sa-as kapat`\n`g!sa-as durum`')
      ]
    });
  }

  if (sub === 'aç') {
    settings.saasAktif = true;
    await settings.save();
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ SA-AS Açıldı')
          .setDescription('Artık biri "sa" yazarsa otomatik "as" cevabı verilecek.')
      ]
    });
  }

  if (sub === 'kapat') {
    settings.saasAktif = false;
    await settings.save();
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ SA-AS Kapatıldı')
          .setDescription('Otomatik selamlaşma sistemi devre dışı bırakıldı.')
      ]
    });
  }

  if (sub === 'durum') {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('🔍 SA-AS Durumu')
          .addFields({ name: 'Durum', value: settings.saasAktif ? 'Aktif' : 'Pasif', inline: true })
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['saas']
};

module.exports.help = {
  name: 'sa-as'
};
