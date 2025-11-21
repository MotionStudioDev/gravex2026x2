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
        value: '`avatar`,`profil`,`emoji-bilgi`,`emojiler`'
      },
      moderasyon: {
        title: '<:gvenlik:1416529478112383047> | Moderasyon',
        value: '`ban`,`kick`,`sil`,`rol-ver`,`rol-al`,`uyar`'
      },
      sistem: {
        title: '<a:sistemx:1441130022340399124> | Sistem',
        value: '`sayaç`,`reklam-engel`,`küfür-engel`,`anti-raid`,`otorol`,`ses-sistemi`,`emoji-log`'
      },
      sahip: {
        title: '<:owner:1441129983153147975> | Sahip Komutları',
        value: '`sahip reload`,`sahip eval`,`sahip ping`'
      }
    };

    const anaEmbed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('Grave Yardım Menüsü')
      .setDescription('Merhaba, Grave Yardım Menüsündesin. Butonlara basarak komutlar arasında gezebilirsin.\nPrefix: `g!` (Örnek: `g!yardım`)')
      .setFooter({ text: '⚠️ | Database sorunu ile ayarlar kaydedilmemektedir. Yakında düzelecek.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('genel').setLabel('Genel').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('kullanıcı').setLabel('Kullanıcı').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('moderasyon').setLabel('Moderasyon').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('sistem').setLabel('Sistem').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('sahip').setLabel('Sahip').setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({ embeds: [anaEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async i => {
      const kategori = kategoriler[i.customId];
      if (!kategori) return;

      const yeniEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle(`${kategori.title}`)
        .setDescription(kategori.value)
        .setFooter({ text: '⚠️ | Database sorunu ile ayarlar kaydedilmemektedir. Yakında düzelecek.' });

      await i.update({ embeds: [yeniEmbed], components: [row] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  } catch (err) {
    console.error('Yardım komutu hatası:', err);
    message.channel.send('⚠️ | Yardım menüsü oluşturulurken bir hata oluştu.');
  }
};

module.exports.conf = {
  aliases: ['help', 'yardim']
};

module.exports.help = {
  name: 'yardım'
};
