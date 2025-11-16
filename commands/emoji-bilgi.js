const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const emojiRaw = args[0];
  if (!emojiRaw) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Hatalı Kullanım')
          .setDescription('Lütfen bir özel emoji belirt.')
          .setFooter({ text: 'Örnek: g!emoji-bilgi <:emoji:1234567890> veya g!emoji-bilgi 1234567890' })
      ]
    });
  }

  // Mention veya ID ayıklama
  const mentionMatch = emojiRaw.match(/<a?:\w+:(\d+)>/);
  const emojiId = mentionMatch ? mentionMatch[1] : emojiRaw;

  const emoji = client.emojis.cache.get(emojiId);
  if (!emoji) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🔍 Emoji Bulunamadı')
          .setDescription('Bu emoji botun erişiminde değil veya silinmiş.')
          .setFooter({ text: `Emoji ID: ${emojiId}` })
      ]
    });
  }

  const embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle('🧠 Emoji Bilgisi')
    .setThumbnail(emoji.url)
    .setDescription(`${emoji} \`${emoji.name}\`\n\n**ID:** \`${emoji.id}\``)
    .addFields(
      { name: 'Animasyonlu mu?', value: emoji.animated ? 'Evet' : 'Hayır', inline: true },
      { name: 'Oluşturulma', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:F>`, inline: true },
      { name: 'URL', value: `[Tıkla](${emoji.url})`, inline: false }
    )
    .setFooter({ text: 'Emoji bilgisi gösterildi.' });

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = {
  aliases: ['emoji', 'emojibilgi']
};

module.exports.help = {
  name: 'emoji-bilgi'
};
