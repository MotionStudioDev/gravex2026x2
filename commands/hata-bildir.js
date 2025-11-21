const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Bot sahibinin ID'sini buraya yaz
const SAHIP_ID = "702901632136118273";
// Log kanal ID'sini buraya yaz
const LOG_CHANNEL_ID = "1441377140653293692";

module.exports.run = async (client, message, args) => {
  const içerik = args.join(" ");
  if (!içerik) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('<:x2:1441372015343697941> Hatalı Kullanım')
          .setDescription('Lütfen iletmek istediğiniz hata/bug/öneriyi yazınız.\nÖrnek: `g!hata-bildir Botun yardım menüsü çalışmıyor`')
      ]
    });
  }

  // Onay embed'i
  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle('<a:uyar1:1416526541030035530> Hata Bildir Onayı')
    .setDescription(`Şu mesajı iletmek üzeresiniz:\n\`\`\`${içerik}\`\`\`\nOnaylıyorsanız **EVET**, iptal için **HAYIR** basın.`);

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
            .setDescription('Talebiniz iletiliyor, lütfen bekleyin...')
        ],
        components: []
      });

      try {
        // Sahibine DM gönder
        const owner = await client.users.fetch(SAHIP_ID);
        await owner.send({
          embeds: [
            new EmbedBuilder()
              .setColor('DarkBlue')
              .setTitle('<:owner:1441129983153147975> Yeni Hata/Bug/Öneri Bildirimi')
              .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
              .addFields(
                { name: 'Gönderen', value: `${message.author.tag} (${message.author.id})` },
                { name: 'Sunucu', value: `${message.guild.name} (${message.guild.id})` },
                { name: 'Kanal', value: `<#${message.channel.id}>` },
                { name: 'Mesaj ID', value: `${message.id}` },
                { name: 'Mesaj', value: `\`\`\`${içerik}\`\`\`` },
                { name: 'Zaman', value: `<t:${Math.floor(Date.now()/1000)}:F>` }
              )
              .setFooter({ text: 'Hey! Graveden mesajın var.' })
          ]
        });

        // Log kanalına gönder
        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor('DarkPurple')
                .setTitle('<:hastag:1441378933181251654> Hata/Bug/Öneri Log')
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .addFields(
                  { name: 'Gönderen', value: `${message.author.tag} (${message.author.id})` },
                  { name: 'Sunucu', value: `${message.guild.name} (${message.guild.id})` },
                  { name: 'Kanal', value: `<#${message.channel.id}>` },
                  { name: 'Mesaj ID', value: `${message.id}` },
                  { name: 'Mesaj', value: `\`\`\`${içerik}\`\`\`` },
                  { name: 'Zaman', value: `<t:${Math.floor(Date.now()/1000)}:F>` }
                )
                .setTimestamp()
            ]
          });
        }

        // Kullanıcıya DM gönder
        try {
          await message.author.send(
            "<:userx:1441379546929561650> Sayın kullanıcı, talebiniz yetkili ekibimize iletilmiştir. Lütfen geri dönüş mesajı gelirse cevaplayınız."
          );
        } catch {}

        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('<:tik1:1416526332803809401> Talep İletildi')
              .setDescription('Talebiniz başarıyla yetkili ekibe iletildi.')
          ]
        });
      } catch (err) {
        console.error('Hata bildir gönderim hatası:', err);
        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('<:x2:1441372015343697941> Hata')
              .setDescription('Talebiniz iletilirken bir hata oluştu.')
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
            .setDescription('Hata bildir işlemi iptal edildi!')
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
  aliases: ['hata', 'bug-bildir', 'öneri']
};

module.exports.help = {
  name: 'hata-bildir'
};
