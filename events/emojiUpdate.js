const { EmbedBuilder } = require('discord.js');

module.exports = async (oldEmoji, newEmoji) => {
  const client = newEmoji.client;
  const kanalId = client.emojiLogKanalları?.get(newEmoji.guild.id);
  const kanal = kanalId ? newEmoji.guild.channels.cache.get(kanalId) : null;
  if (!kanal || !kanal.permissionsFor(client.user).has('SendMessages')) return;

  if (oldEmoji.name === newEmoji.name) return;

  const embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle('✏️ Emoji Güncellendi')
    .setThumbnail(newEmoji.url)
    .addFields(
      { name: 'Eski İsim', value: oldEmoji.name, inline: true },
      { name: 'Yeni İsim', value: newEmoji.name, inline: true },
      { name: 'ID', value: newEmoji.id, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'Emoji Log' });

  kanal.send({ embeds: [embed] });
};
