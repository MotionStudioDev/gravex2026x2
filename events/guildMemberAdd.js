const { EmbedBuilder } = require('discord.js');

module.exports = async (member) => {
  const client = member.client;
  const guildId = member.guild.id;

  const hedef = client.sayaçlar?.get(guildId);
  if (!hedef) return;

  const mevcut = member.guild.memberCount;
  const kalan = hedef - mevcut;

  const embed = new EmbedBuilder()
    .setColor('Green')
    .setTitle('👤 Yeni Üye Katıldı')
    .setDescription(`**${member.user.tag}** aramıza katıldı!\nHedefe ulaşmak için **${kalan}** kişi kaldı.`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Sayaç sistemi' });

  const kanalId = client.sayaçKanalları?.get(guildId);
  const kanal = kanalId
    ? member.guild.channels.cache.get(kanalId)
    : member.guild.systemChannel;

  if (kanal && kanal.permissionsFor(client.user).has('SendMessages')) {
    kanal.send({ embeds: [embed] });
  }

  if (kalan <= 0) {
    const kutlama = new EmbedBuilder()
      .setColor('Gold')
      .setTitle('🎉 Sayaç Tamamlandı!')
      .setDescription(`Sunucumuz **${hedef}** üyeye ulaştı!\nHoş geldin ${member}, seni aramızda görmek harika!`);

    kanal?.send({ embeds: [kutlama] });
    client.sayaçlar.delete(guildId);
    client.sayaçKanalları.delete(guildId);
  }
};
