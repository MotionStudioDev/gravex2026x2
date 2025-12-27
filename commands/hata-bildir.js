const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Ayarlar
const SAHIP_ID = "702901632136118273";
const LOG_CHANNEL_ID = "1441377140653293692";

module.exports.run = async (client, message, args) => {
  const içerik = args.join(" ");
  // Eğer kullanıcı bir resim yüklediyse onu da yakalayalım
  const ek = message.attachments.first() ? message.attachments.first().proxyURL : null;

  if (!içerik && !ek) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('<:x2:1441372015343697941> Hatalı Kullanım')
          .setDescription('Lütfen iletmek istediğiniz hata/bug/öneriyi yazınız.\nÖrnek: `g!hata-bildir Botun yardım menüsü çalışmıyor`')
      ]
    });
  }

  // Kullanıcıya Onay Soran Embed
  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle('<a:uyar1:1416526541030035530> Bildirim Onayı')
    .setDescription(`Şu mesajı yetkililere iletmek üzeresiniz:\n\`\`\`${içerik || "Sadece Dosya Eki"}\`\`\`\nOnaylıyorsanız **EVET**, iptal için **HAYIR** basın.`)
    .setFooter({ text: 'Onaylamak için 15 saniyeniz var.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('evet').setLabel('EVET').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('hayir').setLabel('HAYIR').setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  // Sadece komutu yazan kişinin butonlara basmasını sağlayan filtre
  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 15000,
    max: 1
  });

  collector.on('collect', async i => {
    if (i.customId === 'evet') {
      // Butona basıldıktan sonra bekleme mesajı
      await i.update({
        embeds: [new EmbedBuilder().setColor('Orange').setDescription('<a:yukle:1440677432976867448> Veriler analiz ediliyor ve iletiliyor...') ],
        components: []
      });

      try {
        // Loglar için ortak Embed hazırlığı
        const reportEmbed = new EmbedBuilder()
          .setColor('DarkBlue')
          .setTitle('<:hastag:1441378933181251654> Yeni Bildirim Alındı')
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '👤 Gönderen', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
            { name: '🌐 Sunucu', value: `${message.guild.name} (\`${message.guild.id}\`)`, inline: true },
            { name: '📍 Kanal', value: `<#${message.channel.id}>`, inline: true },
            { name: '📝 Mesaj', value: içerik ? `\`\`\`${içerik}\`\`\`` : "Mesaj içeriği boş (Sadece dosya)." }
          )
          .setTimestamp();

        if (ek) reportEmbed.setImage(ek);

        // 1. SAHİBE DM GÖNDER (fetch ile kullanıcıyı bulur)
        const owner = await client.users.fetch(SAHIP_ID).catch(() => null);
        if (owner) await owner.send({ embeds: [reportEmbed] }).catch(() => console.log("Sahibin DM'si kapalı."));

        // 2. LOG KANALINA GÖNDER (Kanal Bulma Sorunu Çözüldü)
        // Cache yerine fetch kullanarak kanalı API üzerinden kesin olarak buluruz.
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (logChannel) {
          await logChannel.send({ embeds: [reportEmbed] });
        } else {
          console.error("LOG KANAL HATASI: Belirttiğiniz ID'ye sahip bir kanal bulunamadı veya bot orayı göremiyor.");
        }

        // 3. KULLANICIYA DM GÖNDER
        await message.author.send({
          embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Talebiniz Alındı').setDescription('Bildiriminiz başarıyla sisteme kaydedildi ve yetkililere iletildi.')]
        }).catch(() => {});

        // Kanalda işlemi tamamla
        await msg.edit({
          embeds: [new EmbedBuilder().setColor('Green').setTitle('<:tik1:1416526332803809401> İşlem Başarılı').setDescription('Talebiniz başarıyla yetkili ekibe iletildi.')]
        });

      } catch (err) {
        console.error(err);
        await msg.edit({ content: '❌ Bildirim gönderilirken teknik bir sorun oluştu.' });
      }
    } else {
      // HAYIR butonuna basılırsa
      await i.update({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('<:x2:1441372015343697941> İptal Edildi').setDescription('İşlem kullanıcı tarafından iptal edildi.')],
        components: []
      });
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      msg.edit({ content: '⏰ Süre dolduğu için işlem iptal edildi.', embeds: [], components: [] }).catch(() => {});
    }
  });
};

module.exports.conf = {
  aliases: ['hata', 'bug-bildir', 'öneri']
};

module.exports.help = {
  name: 'hata-bildir'
};
