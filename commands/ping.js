const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  // İlk embed: analiz başlıyor
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Lütfen bekleyin, veriler analiz ediliyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  // Ölçüm
  const latency = Date.now() - message.createdTimestamp;
  const apiPing = Math.round(client.ws.ping);

  // Sonuç embed'i
  const resultEmbed = new EmbedBuilder()
    .setColor('Green')
    .setTitle('<:ping:1416529425813737544> Ping Verileri')
    .addFields(
      { name: 'Mesaj Gecikmesi', value: `${latency}ms`, inline: true },
      { name: 'Bot Ping (API)', value: `${apiPing}ms`, inline: true }
    )
    .setFooter({ text: 'Grave | motionvds.tk' });

  await msg.edit({ embeds: [resultEmbed] });
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: 'ping'
};
