const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message) => {
  try {
    const kategoriler = {
      genel: {
        title: '🔧 Genel Komutlar',
        value: '`g!ping`, `g!istatistik`, `g!uptime`, `g!yardım`'
      },
      kullanıcı: {
        title: '🎭 Kullanıcı Komutları',
        value: '`g!avatar`, `g!profil`, `g!emoji-bilgi`, `g!emojiler`'
      },
      moderasyon: {
        title: '🛡️ Moderasyon',
        value: '`g!ban`, `g!kick`, `g!sil`, `g!rol-ver`, `g!rol-al`, `g!uyar`'
      },
      sistem: {
        title: '📚 Sistem',
        value: '`g!sayaç`, `g!reklam-engel`, `g!küfür-engel`, `g!anti-raid`, `g!otorol`, `g!emoji-log`'
      }
    };

    const embed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('📖 Grave Yardım Menüsü')
      .setDescription('Aşağıdan kategori seçerek komutları görüntüleyebilirsin.')
      .setFooter({ text: 'g!komut-adı yazarak detaylı bilgi alabilirsin.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('genel').setLabel('Genel').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('kullanıcı').setLabel('Kullanıcı').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('moderasyon').setLabel('Moderasyon').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('sistem').setLabel('Sistem').setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 30000
    });

    collector.on('collect', async i => {
      const kategori = kategoriler[i.customId];
      if (!kategori) return;

      const yeniEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle(`📖 ${kategori.title}`)
        .setDescription(kategori.value)
        .setFooter({ text: 'g!komut-adı yazarak detaylı bilgi alabilirsin.' });

      await i.update({ embeds: [yeniEmbed], components: [row] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  } catch (err) {
    console.error('Yardım komutu hatası:', err);
    message.channel.send('❌ Yardım menüsü oluşturulurken bir hata oluştu.');
  }
};

module.exports.conf = {
  aliases: ['help', 'yardim']
};

module.exports.help = {
  name: 'yardım'
};
