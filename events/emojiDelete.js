const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = async (emoji) => {
  const client = emoji.client;

  // Sunucu ayarlarını DB’den çek
  const settings = await GuildSettings.findOne({ guildId: emoji.guild.id });
  if (!settings || !settings.emojiLog) return;

  const kanal = emoji.guild.channels.cache.get(settings.emojiLog);
  if (!kanal || !kanal.permissionsFor(client.user).has('SendMessages')) return;

  const embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('➖ Emoji Silindi')
    .addFields(
      { name: 'İsim', value: emoji.name, inline: true },
      { name: 'Animasyonlu muydu?', value: emoji.animated ? 'Evet' : 'Hayır', inline: true },
      { name: 'ID', value: emoji.id, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'Emoji Log Sistemi' });

  kanal.send({ embeds: [embed] });
};
