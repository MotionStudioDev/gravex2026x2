const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message) => {
  try {
    const kategoriler = {
      genel: {
        title: '<a:discord:1441131310717599886> | Genel Komutlar',
        value: '`ping`,`istatistik`,`uptime`,`yardım`'
      },
      kullanıcı: {
        title: '<:user:1441128594117099664> | Kullanıcı Komutları',
        value: '`avatar`,`profil`,`emoji-bilgi`,`profil`,`emojiler`'
      },
      moderasyon: {
        title: '<:gvenlik:1416529478112383047> | Moderasyon',
        value: '`ban`,`kick`,`sil`,`rol-ver`,`rol-al`,`uyar`'
      },
      sistem: {
        title: '<a:sistemx:1441130022340399124> | Sistem',
        value: '`sayaç`,`reklam-engel`,`küfür-engel`,`anti-raid`,`otorol`,`ses-sistemi`,`emoji-log`'
      }
    };

    const embed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('Grave Yardım Menüsü')
      .setDescription('Merhaba, Grave Yardım Menüsündesin. Butonlara basarak komutlar arasında gezebilirsin prefix g! (Örnek: g!yardım)')
      .setFooter({ text: '⚠️ | Database sorunu ile ayarlar kaydedilmemektedir. Yakında Düzelicek.' });

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
        .setTitle(`${kategori.title}`)
        .setDescription(kategori.value)
        .setFooter({ text: '⚠️ | Database sorunu ile ayarlar kaydedilmemektedir. Yakında Düzelicek.' });

      await i.update({ embeds: [yeniEmbed], components: [row] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  } catch (err) {
    console.error('Yardım komutu hatası:', err);
    message.channel.send('⚠️| Yardım menüsü oluşturulurken bir hata oluştu.');
  }
};

module.exports.conf = {
  aliases: ['help', 'yardim']
};

module.exports.help = {
  name: 'yardım'
};
