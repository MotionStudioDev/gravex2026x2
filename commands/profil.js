const { EmbedBuilder } = require('discord.js');
const moment = require('moment');

module.exports.run = async (client, message, args) => {
  const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
  const user = member.user;

  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle(`${user.username} kullanıcısının profili`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
    .addFields(
      { name: '🆔 Kullanıcı ID', value: user.id, inline: true },
      { name: '📅 Hesap Oluşturulma', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
      { name: '📅 Sunucuya Katılım', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
      { name: '🎭 Kullanıcı Adı', value: `${user.tag}`, inline: false },
      { name: '🎨 Avatar', value: `[Tıkla](${user.displayAvatarURL({ dynamic: true, size: 1024 })})`, inline: false }
    )
    .setFooter({ text: 'Profil bilgileri gösterildi.' });

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = {
  aliases: ['kullanıcı', 'user', 'info']
};

module.exports.help = {
  name: 'profil'
};
