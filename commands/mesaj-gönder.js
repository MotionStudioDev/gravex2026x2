const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SAHIP_ID = "702901632136118273"; // Bot sahibinin ID

module.exports.run = async (client, message, args) => {
  if (message.author.id !== SAHIP_ID) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Yetkisiz')
          .setDescription('Bu komutu sadece bot sahibi kullanabilir.')
      ]
    });
  }

  const hedef = message.mentions.users.first();
  const içerik = args.slice(1).join(" ");

  if (!hedef || !içerik) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('<a:uyar1:1416526541030035530> Hatalı Kullanım')
          .setDescription('Kullanım: `g!mesaj-gönder @üye <mesaj>`')
      ]
    });
  }

  // Onay embed'i
  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle('<a:uyar1:1416526541030035530> Mesaj Gönder Onayı')
    .setDescription(`Şu mesajı **${hedef.tag}** kullanıcısına göndermek üzeresin:\n\`\`\`${içerik}\`\`\`\nOnaylıyorsan **EVET**, iptal için **HAYIR** bas.`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('evet').setLabel('EVET').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('hayir').setLabel('HAYIR').setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 15000
  });

  collector.on('collect', async i => {
    if (i.customId === 'evet') {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor('Orange')
            .setTitle('<a:yukle:1440677432976867448> İşlem Başlatıldı')
            .setDescription('Mesaj gönderiliyor, lütfen bekle...')
        ],
        components: []
      });

      try {
        await hedef.send({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('<:userx:1441379546929561650> Bot Sahibinden Mesaj')
              .setDescription(içerik)
              .setFooter({ text: `Gönderen: ${message.author.tag}` })
              .setTimestamp()
          ]
        });

        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('<:tik1:1416526332803809401> Mesaj Gönderildi')
              .setDescription(`Mesaj başarıyla **${hedef.tag}** kullanıcısına gönderildi.`)
          ]
        });
      } catch (err) {
        console.error('Mesaj gönderim hatası:', err);
        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('<:x2:1441372015343697941> Hata')
              .setDescription('Mesaj gönderilirken bir hata oluştu. Kullanıcının DM’i kapalı olabilir.')
          ]
        });
      }

      collector.stop();
    }

    if (i.customId === 'hayir') {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('<:x2:1441372015343697941> İptal')
            .setDescription('Mesaj gönderme işlemi iptal edildi!')
        ],
        components: []
      });
      collector.stop();
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = {
  aliases: ['dm-gönder', 'dm']
};

module.exports.help = {
  name: 'mesaj-gönder'
};
