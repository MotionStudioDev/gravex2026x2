const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = async (member) => {
  const client = member.client;
  const guildId = member.guild.id;

  // Sunucu ayarlarını DB’den çek
  const settings = await GuildSettings.findOne({ guildId });
  if (!settings || !settings.sayaçHedef) return;

  const mevcut = member.guild.memberCount;
  const kalan = settings.sayaçHedef - mevcut;

  const embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('📉 Bir Üye Ayrıldı')
    .setDescription(`**${member.user.tag}** sunucudan ayrıldı.\nHedefe ulaşmak için **${kalan}** kişi kaldı.`)
    .setFooter({ text: 'Sayaç sistemi' });

  const kanal = settings.sayaçKanal
    ? member.guild.channels.cache.get(settings.sayaçKanal)
    : member.guild.systemChannel;

  if (kanal && kanal.permissionsFor(client.user).has('SendMessages')) {
    kanal.send({ embeds: [embed] });
  }
};
