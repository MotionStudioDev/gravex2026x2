const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Lütfen bekleyin, veriler analiz ediliyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  const latency = Date.now() - message.createdTimestamp;
  const apiPing = Math.round(client.ws.ping);

  const resultEmbed = new EmbedBuilder()
    .setColor('Green')
    .setTitle('📡 Ping Verileri')
    .addFields(
      { name: 'Mesaj Gecikmesi', value: `${latency}ms`, inline: true },
      { name: 'Bot Ping (API)', value: `${apiPing}ms`, inline: true }
    )
    .setFooter({ text: 'Veriler analiz edildi.' });

  await msg.edit({ embeds: [resultEmbed] });
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: 'ping'
};
