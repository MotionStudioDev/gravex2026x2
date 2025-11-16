const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

module.exports.run = async (client, message, args) => {
  const duration = moment.duration(client.uptime).format('D [gün], H [saat], m [dakika], s [saniye]');

  const embed = new EmbedBuilder()
    .setColor('Blue')
    .setTitle('🕒 Bot Uptime')
    .setDescription(`Bot şu süredir aktif:\n\n**${duration}**`)
    .setFooter({ text: 'Canavar gibi çalışıyor!' });

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: 'uptime'
};
