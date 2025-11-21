const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  // Yetki kontrolü
  if (!message.member.permissions.has('ManageChannels')) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('<:x_:1416529392955555871> Yetki Yok')
          .setDescription('Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısın.')
      ]
    });
  }

  // Kanal ve süre argümanlarını ayır
  let targetChannel = message.mentions.channels.first() || message.channel;
  let süreArg = message.mentions.channels.first() ? args[1] : args[0];
  const süre = parseInt(süreArg);

  if (isNaN(süre) || süre < 0 || süre > 21600) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('<:x_:1416529392955555871> Hatalı Kullanım')
          .setDescription('Lütfen geçerli bir süre gir (0‑21600 saniye).\nÖrnek: `g!slowmode 10` veya `g!slowmode #kanal 15`')
      ]
    });
  }

  try {
    await targetChannel.setRateLimitPerUser(süre);

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('<a:tickgre:1416899456246349854> Slowmode Ayarlandı')
          .setDescription(
            süre === 0
              ? `Slowmode kapatıldı, kullanıcılar sınırsız mesaj atabilir.\nKanal: <#${targetChannel.id}>`
              : `Slowmode aktif! Kullanıcılar her **${süre} saniyede** bir mesaj atabilir.\nKanal: <#${targetChannel.id}>`
          )
      ]
    });
  } catch (err) {
    console.error('Slowmode hatası:', err);
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('<:x_:1416529392955555871> Hata')
          .setDescription('Slowmode ayarlanırken bir hata oluştu.')
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['yavaşmod', 'slow']
};

module.exports.help = {
  name: 'slowmode'
};
