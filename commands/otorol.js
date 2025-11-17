const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has('Administrator')) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Red').setTitle('🚫 Yetki Yok').setDescription('Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.')]
    });
  }

  const sub = args[0]?.toLowerCase();
  const guildId = message.guild.id;

  if (!sub || !['ayarla', 'kapat'].includes(sub)) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Orange').setTitle('ℹ️ Otorol Komutu').setDescription('Kullanım:\n`g!otorol ayarla <@rol>`\n`g!otorol kapat`')]
    });
  }

  if (sub === 'kapat') {
    client.otoroller.delete(guildId);
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Otorol Kapatıldı').setDescription('Yeni gelenlere otomatik rol verilmeyecek.')]
    });
  }

  if (sub === 'ayarla') {
    const rol = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
    if (!rol) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Geçersiz Rol').setDescription('Lütfen geçerli bir rol etiketle veya ID gir.')]
      });
    }

    client.otoroller.set(guildId, rol.id);
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Otorol Ayarlandı').setDescription(`Yeni gelenlere otomatik olarak <@&${rol.id}> rolü verilecek.`)]
    });
  }
};

module.exports.conf = {
  aliases: ['otorol']
};

module.exports.help = {
  name: 'otorol'
};
