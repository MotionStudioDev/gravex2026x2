const { EmbedBuilder } = require('discord.js');
const db = require('orio.db');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has('Administrator')) {
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('Red')
        .setTitle('🚫 Yetki Yok')
        .setDescription('Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.')]
    });
  }

  const sub = args[0]?.toLowerCase();
  const guildId = message.guild.id;

  if (!sub || !['aç', 'kapat', 'durum', 'log'].includes(sub)) {
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('Orange')
        .setTitle('ℹ️ Reklam Engel Komutu')
        .setDescription('Kullanım:\n`g!reklam-engel aç`\n`g!reklam-engel kapat`\n`g!reklam-engel durum`\n`g!reklam-engel log <#kanal>`')]
    });
  }

  if (sub === 'aç') {
    db.set(`reklamEngel_${guildId}`, true);
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Reklam Engel Açıldı')
        .setDescription('Artık reklam içeren mesajlar silinecek.')]
    });
  }

  if (sub === 'kapat') {
    db.delete(`reklamEngel_${guildId}`);
    db.delete(`reklamLog_${guildId}`); // Log bilgisini de sil
    client.reklamLogKanalları.delete(guildId);
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Reklam Engel Kapatıldı')
        .setDescription('Reklam engelleme sistemi devre dışı bırakıldı.')]
    });
  }

  if (sub === 'durum') {
    const aktif = db.get(`reklamEngel_${guildId}`);
    const logKanalId = db.get(`reklamLog_${guildId}`);
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🔍 Reklam Engel Durumu')
        .addFields(
          { name: 'Durum', value: aktif ? 'Aktif' : 'Pasif', inline: true },
          { name: 'Log Kanalı', value: logKanalId ? `<#${logKanalId}>` : 'Ayarlanmamış', inline: true }
        )]
    });
  }

  if (sub === 'log') {
    const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
    if (!kanal || kanal.type !== 0) {
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Geçersiz Kanal')
          .setDescription('Lütfen geçerli bir metin kanalı etiketle veya ID gir.')]
      });
    }

    client.reklamLogKanalları.set(guildId, kanal.id);
    db.set(`reklamLog_${guildId}`, kanal.id); // Log bilgisini kalıcı yap
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Log Kanalı Ayarlandı')
        .setDescription(`Reklam logları artık <#${kanal.id}> kanalına gönderilecek.`)]
    });
  }
};

module.exports.conf = {
  aliases: ['reklamengel']
};

module.exports.help = {
  name: 'reklam-engel'
};
