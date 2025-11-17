const { EmbedBuilder } = require('discord.js');

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

  const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
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

  client.emojiLogKanalları.set(message.guild.id, kanal.id);

  return message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Emoji Log Kanalı Ayarlandı')
        .setDescription(`Emoji logları artık <#${kanal.id}> kanalına gönderilecek.`)
    ]
  });
};

module.exports.conf = {
  aliases: ['emojilog']
};

module.exports.help = {
  name: 'emoji-log'
};
