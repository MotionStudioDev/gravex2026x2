const { EmbedBuilder } = require('discord.js');

module.exports = async (emoji) => {
  const client = emoji.client;
  const kanalId = client.emojiLogKanalları?.get(emoji.guild.id);
  const kanal = kanalId ? emoji.guild.channels.cache.get(kanalId) : null;
  if (!kanal || !kanal.permissionsFor(client.user).has('SendMessages')) return;

  const embed = new EmbedBuilder()
    .setColor('Green')
    .setTitle('➕ Yeni Emoji Eklendi')
    .setThumbnail(emoji.url)
    .addFields(
      { name: 'İsim', value: emoji.name, inline: true },
      { name: 'Animasyonlu mu?', value: emoji.animated ? 'Evet' : 'Hayır', inline: true },
      { name: 'ID', value: emoji.id, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'Grave Emoji Log Sistemi' });

  kanal.send({ embeds: [embed] });
};
