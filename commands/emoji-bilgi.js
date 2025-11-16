const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const emojiRaw = args[0];
  if (!emojiRaw) return message.reply('Bir emoji belirtmelisin.');

  const emojiMatch = emojiRaw.match(/<a?:\w+:(\d+)>/);
  if (!emojiMatch) return message.reply('Geçerli bir özel emoji belirtmelisin.');

  const emojiId = emojiMatch[1];
  const emoji = client.emojis.cache.get(emojiId);
  if (!emoji) return message.reply('Bu emoji botun erişiminde değil.');

  const embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle('🧠 Emoji Bilgisi')
    .setThumbnail(emoji.url)
    .addFields(
      { name: 'Ad', value: emoji.name, inline: true },
      { name: 'ID', value: emoji.id, inline: true },
      { name: 'Animasyonlu mu?', value: emoji.animated ? 'Evet' : 'Hayır', inline: true },
      { name: 'Oluşturulma', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:F>`, inline: false },
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
