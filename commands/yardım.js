const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message) => {
  try {
    // Ping durumu
    const ping = client.ws.ping;
    let pingEmoji = '🟢';
    if (ping > 200) pingEmoji = '🔴';
    else if (ping > 100) pingEmoji = '🟡';

    const pages = [
      new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('Grave Yardım Menüsü')
        .setDescription(`Prefix: \`g!\`\n\nButonlarla sayfalar arasında gezebilirsin.\n\n **Anlık Ping:** ${pingEmoji} **${ping}ms**`)
        .setFooter({ text: 'GraveBOT 2026' }),

      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('<a:discord:1441131310717599886> | Genel Komutlar')
        .setDescription('`ping`,`istatistik`,`uptime`,`hatırlat`,`hata-bildir`,`yardım`\n\n📡 Şu anki ping: ' + pingEmoji + ` **${ping}ms**`),

      new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('<:user:1441128594117099664> | Kullanıcı Komutları')
        .setDescription('`avatar`,`profil`,`deprem`,`döviz`,`çeviri`,`emoji-bilgi`,`emojiler`'),

      new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('<:gvenlik:1416529478112383047> | Moderasyon')
        .setDescription('`ban`,`kick`,`sil`,`rol-ver`,`rol-al`,`temizle`,`uyar`'),

      new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('<a:sistemx:1441130022340399124> | Sistem')
        .setDescription('`sayaç`,`reklam-engel`,`level-sistemi`,`küfür-engel`,`anti-raid`,`jail-sistemi`,`kayıt-sistemi`,`otorol`,`sa-as`,`ses-sistemi`,`slowmode`,`emoji-log`'),

      new EmbedBuilder()
        .setColor(0x99AAB5)
        .setTitle('<:owner:1441129983153147975> | Sahip Komutları')
        .setDescription('`reload`,`mesaj-gönder`')
    ];

    let page = 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('home').setLabel('🏠').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({ embeds: [pages[page]], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'prev') page = page > 0 ? page - 1 : pages.length - 1;
      if (i.customId === 'next') page = page < pages.length - 1 ? page + 1 : 0;
      if (i.customId === 'home') page = 0;

      await i.update({ embeds: [pages[page]], components: [row] });
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
    console.error('Yardım komutu hatası:', err);
    message.channel.send('⚠️ | Yardım menüsü oluşturulurken bir hata oluştu.');
  }
};

module.exports.conf = { aliases: ['help', 'yardim'] };
module.exports.help = { name: 'yardım' };
