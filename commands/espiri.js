const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const espiriler = require('../espiriler.json'); // JSON dosyasını çağırıyoruz

module.exports.run = async (client, message) => {
  try {
    let espiri = espiriler[Math.floor(Math.random() * espiriler.length)];

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Grave ile Espiri Zamanı')
      .setDescription(espiri);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('yenile')
        .setLabel('🔄 Espiriyi Yenile')
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'yenile') {
        espiri = espiriler[Math.floor(Math.random() * espiriler.length)];
        const newEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('Grave ile Espiri Zamanı')
          .setDescription(espiri);

        await i.update({ embeds: [newEmbed], components: [row] });
      }
    });

    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
        await msg.edit({ components: [disabledRow] });
      } catch {}
    });
  } catch (err) {
    console.error('espiri komutu hatası:', err);
    message.channel.send('⚠️ | Espiri komutu sırasında bir hata oluştu.');
  }
};

module.exports.conf = { aliases: ['espiri', 'joke'] };
module.exports.help = { name: 'espiri' };
