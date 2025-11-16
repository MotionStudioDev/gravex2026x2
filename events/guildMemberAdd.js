const { EmbedBuilder } = require('discord.js');

module.exports = async (member) => {
  const client = member.client;
  const guildId = member.guild.id;

  const hedef = client.sayaçlar?.get(guildId);
  if (!hedef) return;

  const mevcut = member.guild.memberCount;
  const kalan = hedef - mevcut;

  if (kalan <= 0) {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🎉 Sayaç Tamamlandı!')
      .setDescription(`Sunucumuz **${hedef}** üyeye ulaştı!\nHoş geldin ${member}, seni aramızda görmek harika!`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Sayaç sistemi' });

    const kanalId = client.sayaçKanalları?.get(guildId);
    const kanal = kanalId
      ? member.guild.channels.cache.get(kanalId)
      : member.guild.systemChannel || member.guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(client.user).has('SendMessages'));

    if (kanal) kanal.send({ embeds: [embed] });

    client.sayaçlar.delete(guildId);
    client.sayaçKanalları.delete(guildId);
  }
};
