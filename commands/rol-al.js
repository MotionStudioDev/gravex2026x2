const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const moment = require('moment');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('🚫 Yetki Yok')
      .setDescription('Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısın.');
    return message.channel.send({ embeds: [embed] });
  }

  const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
  const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

  if (!target || !role) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('❌ Hatalı Kullanım')
      .setDescription('Kullanıcı veya rol belirtilmedi.\n\n**Doğru kullanım:** `g!rol-al @kullanıcı @rol`');
    return message.channel.send({ embeds: [embed] });
  }

  if (!target.roles.cache.has(role.id)) {
    const embed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('ℹ️ Rol Zaten Yok')
      .setDescription(`${target} kullanıcısında zaten ${role} rolü yok.`);
    return message.channel.send({ embeds: [embed] });
  }

  try {
    await target.roles.remove(role);

    const tarih = moment().format('DD.MM.YYYY');
    const saat = moment().format('HH:mm:ss');

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('✅ Rol Alındı')
      .addFields(
        { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: false },
        { name: 'Alınan Rol', value: `${role.name} (${role.id})`, inline: false },
        { name: 'Yetkili', value: `${message.author.tag} (${message.author.id})`, inline: false },
        { name: 'Tarih', value: tarih, inline: true },
        { name: 'Saat', value: saat, inline: true }
      )
      .setFooter({ text: 'Rol yönetim sistemi' });

    message.channel.send({ embeds: [embed] });
  } catch (err) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('❌ Rol Alınamadı')
      .setDescription(`Bir hata oluştu: \`${err.message}\``);
    message.channel.send({ embeds: [embed] });
  }
};

module.exports.conf = {
  aliases: ['rolal']
};

module.exports.help = {
  name: 'rol-al'
};
