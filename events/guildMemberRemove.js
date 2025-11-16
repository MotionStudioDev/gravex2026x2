const { EmbedBuilder } = require('discord.js');

module.exports = async (member) => {
  const client = member.client;
  const guildId = member.guild.id;

  const hedef = client.sayaçlar?.get(guildId);
  if (!hedef) return;

  const mevcut = member.guild.memberCount;
  const kalan = hedef - mevcut;

  const embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('📉 Bir Üye Ayrıldı')
    .setDescription(`**${member.user.tag}** sunucudan ayrıldı.\nHedefe ulaşmak için **${kalan}** kişi kaldı.`)
    .setFooter({ text: 'Sayaç sistemi' });

  const kanalId = client.sayaçKanalları?.get(guildId);
  const kanal = kanalId
    ? member.guild.channels.cache.get(kanalId)
    : member.guild.systemChannel;

  if (kanal && kanal.permissionsFor(client.user).has('SendMessages')) {
    kanal.send({ embeds: [embed] });
  }
};
