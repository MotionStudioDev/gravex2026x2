const { EmbedBuilder } = require('discord.js');

module.exports = async (member) => {
  const client = member.client;
  const guildId = member.guild.id;
  const user = member.user;

  // ✅ SAYAÇ
  const hedef = client.sayaçlar?.get(guildId);
  if (hedef) {
    const mevcut = member.guild.memberCount;
    const kalan = hedef - mevcut;

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('👤 Yeni Üye Katıldı')
      .setDescription(`**${user.tag}** aramıza katıldı!\nHedefe ulaşmak için **${kalan}** kişi kaldı.`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Sayaç sistemi' });

    const kanalId = client.sayaçKanalları?.get(guildId);
    const kanal = kanalId ? member.guild.channels.cache.get(kanalId) : member.guild.systemChannel;

    if (kanal && kanal.permissionsFor(client.user).has('SendMessages')) {
      kanal.send({ embeds: [embed] });
    }

    if (kalan <= 0) {
      const kutlama = new EmbedBuilder()
        .setColor('Gold')
        .setTitle('🎉 Sayaç Tamamlandı!')
        .setDescription(`Sunucumuz **${hedef}** üyeye ulaştı!\nHoş geldin ${user}, seni aramızda görmek harika!`);
      kanal?.send({ embeds: [kutlama] });
      client.sayaçlar.delete(guildId);
      client.sayaçKanalları.delete(guildId);
    }
  }

  // ✅ ANTI-RAID
  const ayar = client.antiRaid?.get(guildId);
  if (ayar?.aktif) {
    if (user.bot) {
      const whitelist = client.antiRaidBotWhitelist.get(guildId);
      if (whitelist?.has(user.id)) return;
    }

    const now = Date.now();
    const girişler = client.antiRaidGirişler.get(guildId) || [];
    const yeniGirişler = [...girişler, now].filter(t => now - t <= ayar.süre * 1000);
    client.antiRaidGirişler.set(guildId, yeniGirişler);

    if (yeniGirişler.length >= ayar.eşik) {
      const logKanalId = client.antiRaidLogKanalları?.get(guildId);
      const logKanal = logKanalId ? member.guild.channels.cache.get(logKanalId) : null;

      const raidEmbed = new EmbedBuilder()
        .setColor('DarkRed')
        .setTitle('🚨 Raid Algılandı')
        .setDescription(`**${ayar.süre} saniye** içinde **${yeniGirişler.length}** kişi sunucuya katıldı.`)
        .addFields({ name: 'Zaman', value: `<t:${Math.floor(now / 1000)}:F>`, inline: false })
        .setFooter({ text: 'Anti-Raid sistemi' });

      if (logKanal && logKanal.permissionsFor
