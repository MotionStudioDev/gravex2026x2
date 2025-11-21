const { EmbedBuilder, ChannelType } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  const sub = args[0]?.toLowerCase();
  const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
  const guildId = message.guild.id;

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

  // Sunucu ayarını bul veya oluştur
  let settings = await GuildSettings.findOne({ guildId });
  if (!settings) settings = new GuildSettings({ guildId });

  // ✅ emoji-log ayarla
  if (sub === 'ayarla') {
    if (settings.emojiLog) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Orange')
            .setTitle('⚠️ Sistem Zaten Aktif')
            .setDescription(`Emoji log sistemi zaten aktif. Loglar <#${settings.emojiLog}> kanalına gönderiliyor.`)
        ]
      });
    }

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

    settings.emojiLog = kanal.id;
    await settings.save();

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Emoji Log Kanalı Ayarlandı')
          .setDescription(`Emoji logları artık <#${kanal.id}> kanalına gönderilecek.`)
      ]
    });
  }

  // ✅ emoji-log durum
  if (sub === 'durum') {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('🔍 Emoji Log Durumu')
          .addFields({
            name: 'Log Kanalı',
            value: settings.emojiLog ? `<#${settings.emojiLog}>` : 'Ayarlanmamış',
            inline: true
          })
      ]
    });
  }

  // ✅ emoji-log kapat
  if (sub === 'kapat') {
    if (!settings.emojiLog) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Orange')
            .setTitle('ℹ️ Zaten Kapalı')
            .setDescription('Bu sunucuda aktif emoji log sistemi yok.')
        ]
      });
    }

    settings.emojiLog = null;
    await settings.save();

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Log Kapatıldı')
          .setDescription('Emoji log sistemi devre dışı bırakıldı.')
      ]
    });
  }

  // ❓ Geçersiz kullanım
  return message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor('Orange')
        .setTitle('ℹ️ Emoji Log Komutu')
        .setDescription(
          'Kullanım:\n`g!emoji-log ayarla <#kanal>`\n`g!emoji-log durum`\n`g!emoji-log kapat`'
        )
    ]
  });
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: 'emoji-log'
};
