const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'ping',
  async execute(message, args, client) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ping_guncelle')
        .setLabel('Verileri Güncelle')
        .setStyle(ButtonStyle.Primary)
    );

    const loadingEmbed = new EmbedBuilder()
      .setColor('Yellow')
      .setDescription('⏳ Lütfen bekleyin, veriler analiz ediliyor...');

    const msg = await message.reply({ embeds: [loadingEmbed] });

    const latency = Date.now() - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    const resultEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('📡 Ping Verileri')
      .addFields(
        { name: 'Mesaj Gecikmesi', value: `${latency}ms`, inline: true },
        { name: 'Bot Ping (API)', value: `${apiPing}ms`, inline: true }
      )
      .setFooter({ text: 'Verileri Güncelle butonunu kullanabilirsiniz.' });

    await msg.edit({ embeds: [resultEmbed], components: [row] });
  }
};
