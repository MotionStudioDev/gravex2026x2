const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle(`${target.username} kullanıcısının avatarı`)
    .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
    .setFooter({ text: `ID: ${target.id}` });

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = {
  aliases: ['pp', 'profil']
};

module.exports.help = {
  name: 'avatar'
};
