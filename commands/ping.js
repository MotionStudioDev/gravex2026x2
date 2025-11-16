const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  async execute(message, args, client) {
    // İlk embed: analiz başlıyor
    const loadingEmbed = new EmbedBuilder()
      .setColor('Yellow')
      .setDescription('⏳ Lütfen bekleyin, veriler analiz ediliyor...');

    const msg = await message.reply({ embeds: [loadingEmbed] });

    // Ölçüm
    const latency = Date.now() - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    // Sonuç embed'i
    const resultEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('📡 Ping Verileri')
      .addFields(
        { name: 'Mesaj Gecikmesi', value: `${latency}ms`, inline: true },
        { name: 'Bot Ping (API)', value: `${apiPing}ms`, inline: true }
      )
      .setFooter({ text: 'Veriler analiz edildi.' });

    // Mesajı güncelle
    await msg.edit({ embeds: [resultEmbed] });
  }
};
