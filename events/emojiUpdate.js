const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = async (oldEmoji, newEmoji) => {
  const client = newEmoji.client;

  // Sunucu ayarlarını DB’den çek
  const settings = await GuildSettings.findOne({ guildId: newEmoji.guild.id });
  if (!settings || !settings.emojiLog) return;

  const kanal = newEmoji.guild.channels.cache.get(settings.emojiLog);
  if (!kanal || !kanal.permissionsFor(client.user).has('SendMessages')) return;

  // İsim değişmemişse loglama
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
    .setFooter({ text: 'Emoji Log Sistemi' });

  kanal.send({ embeds: [embed] });
};
