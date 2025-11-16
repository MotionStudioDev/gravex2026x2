const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'ping_guncelle') return;

  await interaction.deferUpdate();

  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('🔄 Lütfen bekleyin, veriler güncelleniyor...');

  await interaction.editReply({ embeds: [loadingEmbed], components: [] });

  setTimeout(async () => {
    const latency = Date.now() - interaction.message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    const updatedEmbed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('📡 Güncellenmiş Ping Verileri')
      .addFields(
        { name: 'Mesaj Gecikmesi', value: `${latency}ms`, inline: true },
        { name: 'Bot Ping (API)', value: `${apiPing}ms`, inline: true }
      )
      .setFooter({ text: 'Veriler güncellendi.' });

    await interaction.editReply({ embeds: [updatedEmbed], components: [] });
  }, 1000);
};

module.exports.conf = {
  event: 'interactionCreate'
};
