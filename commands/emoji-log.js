const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const sub = args[0]?.toLowerCase();
  const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
  const guildId = message.guild.id;

  if (!message.member.permissions.has('Administrator')) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Red').setTitle('🚫 Yetki Yok').setDescription('Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.')]
    });
  }

  // ✅ emoji-log ayarla
  if (sub === 'ayarla') {
    if (!kanal || kanal.type !== 0) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Geçersiz Kanal').setDescription('Lütfen geçerli bir metin kanalı etiketle veya ID gir.')]
      });
    }

    client.emojiLogKanalları.set(guildId, kanal.id);
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Emoji Log Kanalı Ayarlandı').setDescription(`Emoji logları artık <#${kanal.id}> kanalına gönderilecek.`)]
    });
  }

  // ✅ emoji-log durum
  if (sub === 'durum') {
    const logKanalId = client.emojiLogKanalları?.get(guildId);
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Blurple').setTitle('🔍 Emoji Log Durumu').addFields(
        { name: 'Log Kanalı', value: logKanalId ? `<#${logKanalId}>` : 'Ayarlanmamış', inline: true }
      )]
    });
  }

  // ✅ emoji-log kapat
  if (sub === 'kapat') {
    const silindi = client.emojiLogKanalları.delete(guildId);
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor(silindi ? 'Green' : 'Orange').setTitle(silindi ? '✅ Log Kapatıldı' : 'ℹ️ Zaten Kapalı').setDescription(
        silindi ? 'Emoji log sistemi devre dışı bırakıldı.' : 'Bu sunucuda aktif emoji log sistemi yok.'
      )]
    });
  }

  // ❓ Geçersiz kullanım
  return message.channel.send({
    embeds: [new EmbedBuilder().setColor('Orange').setTitle('ℹ️ Emoji Log Komutu').setDescription(
      'Kullanım:\n`g!emoji-log ayarla <#kanal>`\n`g!emoji-log durum`\n`g!emoji-log kapat`'
    )]
  });
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: 'emoji-log'
};
