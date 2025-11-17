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
          .setTitle('Grave Küfür Engel Sistemi')
          .setDescription('Kullanım:\n`g!küfür-engel aç`\n`g!küfür-engel kapat`\n`g!küfür-engel durum`\n`g!küfür-engel log <#kanal>`')
      ]
    });
  }

  // Küfür Engel Aç
  if (sub === 'aç') {
    db.set(`kufurEngel_${guildId}`, true);
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Küfür Engel Aktif Edildi')
          .setDescription('Küfür engel sistemi artık aktif.')
      ]
    });
  }

  // Küfür Engel Kapat
  if (sub === 'kapat') {
    db.delete(`kufurEngel_${guildId}`);
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Küfür Engel Devre Dışı')
          .setDescription('Küfür engel sistemi kapatıldı.')
      ]
    });
  }

  // Durum Kontrol
  if (sub === 'durum') {
    const aktif = db.has(`kufurEngel_${guildId}`);
    const logKanal = db.get(`kufurLog_${guildId}`);
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('🔍 Küfür Engel Durumu')
          .addFields(
            { name: 'Durum', value: aktif ? 'Aktif' : 'Pasif', inline: true },
            { name: 'Log Kanalı', value: logKanal ? `<#${logKanal}>` : 'Ayarlanmamış', inline: true }
          )
      ]
    });
  }

  // Log Kanalı Ayarla
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

    db.set(`kufurLog_${guildId}`, kanal.id);
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Log Kanalı Ayarlandı')
          .setDescription(`Küfür logları artık <#${kanal.id}> kanalına gönderilecek.`)
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['küfürengel']
};

module.exports.help = {
  name: 'küfür-engel'
};
