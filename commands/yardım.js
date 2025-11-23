const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message) => {
  try {
    const kategoriler = {
      genel: {
        title: '<a:discord:1441131310717599886> | Genel Komutlar',
        value: '`ping`,`istatistik`,`uptime`,`hata-bildir`,`yardım`'
      },
      kullanıcı: {
        title: '<:user:1441128594117099664> | Kullanıcı Komutları',
        value: '`avatar`,`profil`,`deprem`,`emoji-bilgi`,`emojiler`'
      },
      moderasyon: {
        title: '<:gvenlik:1416529478112383047> | Moderasyon',
        value: '`ban`,`kick`,`sil`,`rol-ver`,`rol-al`,`temizle`,`uyar`'
      },
      sistem: {
        title: '<a:sistemx:1441130022340399124> | Sistem',
        value: '`sayaç`,`reklam-engel`,`level-sistemi`,`küfür-engel`,`anti-raid`,`kayıt-sistemi`,`otorol`,`sa-as`,`ses-sistemi`,`slowmode`,`emoji-log`'
      },
      sahip: {
        title: '<:owner:1441129983153147975> | Sahip Komutları',
        value: '`reload`,`mesaj-gönder`'
      }
    };

    const anaEmbed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('Grave Yardım Menüsü')
      .setDescription('Merhaba, Grave Yardım Menüsündesin. Butonlara basarak komutlar arasında gezebilirsin.\nPrefix: `g!` (Örnek: `g!yardım`)')
      .setFooter({ text: 'GraveBOT 2026' });

    // Satır 1: 4 kategori
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('genel').setLabel('Genel').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('kullanıcı').setLabel('Kullanıcı').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('moderasyon').setLabel('Moderasyon').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('sistem').setLabel('Sistem').setStyle(ButtonStyle.Secondary)
    );

    // Satır 2: Sahip + Ana Menü
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('sahip').setLabel('Sahip').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ana').setLabel('Ana Menü').setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({ embeds: [anaEmbed], components: [row1, row2] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'ana') {
        await i.update({ embeds: [anaEmbed], components: [row1, row2] });
        return;
      }

      const kategori = kategoriler[i.customId];
      if (!kategori) return;

      const yeniEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle(`${kategori.title}`)
        .setDescription(kategori.value)
        .setFooter({ text: 'Grave 2026' });

      await i.update({ embeds: [yeniEmbed], components: [row1, row2] });
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
