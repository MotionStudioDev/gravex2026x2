const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has('Administrator')) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Yetki Yok')
          .setDescription('Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.')
      ]
    });
  }

  const sub = args[0]?.toLowerCase();
  const guildId = message.guild.id;

  if (!sub || !['aç', 'kapat', 'durum', 'log'].includes(sub)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Orange')
          .setTitle('ℹ️ Anti-Raid Komutu')
          .setDescription('Kullanım:\n`g!anti-raid aç <eşik> <saniye>`\n`g!anti-raid kapat`\n`g!anti-raid durum`\n`g!anti-raid log <#kanal>`')
      ]
    });
  }

  if (sub === 'aç') {
    const eşik = parseInt(args[1]);
    const süre = parseInt(args[2]);

    if (!eşik || !süre || eşik < 2 || süre < 5) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Geçersiz Parametre')
            .setDescription('Kullanım: `g!anti-raid aç <eşik> <saniye>`\nÖrnek: `g!anti-raid aç 5 10`')
        ]
      });
    }

    client.antiRaid.set(guildId, { aktif: true, eşik, süre });
    client.antiRaidGirişler.set(guildId, []);

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Anti-Raid Aktif Edildi')
          .setDescription(`Süre: **${süre}sn**, Eşik: **${eşik} kişi**`)
      ]
    });
  }

  if (sub === 'kapat') {
    client.antiRaid.delete(guildId);
    client.antiRaidGirişler.delete(guildId);
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Anti-Raid Devre Dışı')
          .setDescription('Sistem kapatıldı.')
      ]
    });
  }

  if (sub === 'durum') {
    const ayar = client.antiRaid.get(guildId);
    const logKanal = client.antiRaidLogKanalları.get(guildId);
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('🔍 Anti-Raid Durumu')
          .addFields(
            { name: 'Durum', value: ayar?.aktif ? 'Aktif' : 'Pasif', inline: true },
            { name: 'Eşik', value: ayar?.eşik?.toString() || '-', inline: true },
            { name: 'Süre', value: ayar?.süre?.toString() + 'sn' || '-', inline: true },
            { name: 'Log Kanalı', value: logKanal ? `<#${logKanal}>` : 'Ayarlanmamış', inline: false }
          )
      ]
    });
  }

  if (sub === 'log') {
    const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
    if (!kanal || kanal.type !== 0) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Geçersiz Kanal')
            .setDescription('Lütfen geçerli bir metin kanalı etiketle veya ID gir.')
        ]
      });
    }

    client.antiRaidLogKanalları.set(guildId, kanal.id);
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Log Kanalı Ayarlandı')
          .setDescription(`Raid logları artık <#${kanal.id}> kanalına gönderilecek.`)
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['antiraid']
};

module.exports.help = {
  name: 'anti-raid'
};
