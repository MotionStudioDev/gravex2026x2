const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const moment = require('moment');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('🚫 Yetki Yok')
      .setDescription('Bu komutu kullanmak için `Üyeleri At` yetkisine sahip olmalısın.');
    return message.channel.send({ embeds: [embed] });
  }

  const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
  const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

  if (!target) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('❌ Kullanıcı Bulunamadı')
      .setDescription('Lütfen geçerli bir kullanıcı etiketle veya ID gir.');
    return message.channel.send({ embeds: [embed] });
  }

  if (!target.kickable) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('🔒 Kick Başarısız')
      .setDescription('Bu kullanıcıyı atamıyorum. Yetkim yetersiz olabilir.');
    return message.channel.send({ embeds: [embed] });
  }

  await target.kick(reason);

  const tarih = moment().format('DD.MM.YYYY');
  const saat = moment().format('HH:mm:ss');

  const embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle('✅ Kick Başarılı')
    .addFields(
      { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: false },
      { name: 'Yetkili', value: `${message.author.tag} (${message.author.id})`, inline: false },
      { name: 'Sebep', value: reason, inline: false },
      { name: 'Tarih', value: `${tarih}`, inline: true },
      { name: 'Saat', value: `${saat}`, inline: true }
    )
    .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Grave Kick Sistemi' });

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: 'kick'
};
