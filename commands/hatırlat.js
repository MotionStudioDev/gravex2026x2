const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function parseDuration(str) {
  const match = str.match(/(\d+)([smhd])/); // saniye, dakika, saat, gün
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

module.exports.run = async (client, message, args) => {
  if (args.length < 2) {
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🚫 Hata")
        .setDescription("Doğru kullanım: `g!hatırlat <süre> <mesaj>`\nÖrn: `g!hatırlat 10m toplantı 20:00`")]
    });
  }

  const duration = parseDuration(args[0]);
  if (!duration) {
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🚫 Hata")
        .setDescription("Süre formatı yanlış! Örn: `10m`, `2h`, `30s`, `1d`")]
    });
  }

  const reminderText = args.slice(1).join(" ");

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📌 Hatırlatma Mesajı")
    .setDescription(`**${reminderText}**\n⏰ Süre: ${args[0]}`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('remind_set').setLabel('HATIRLAT').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('remind_delete').setLabel('SİL').setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    if (i.customId === 'remind_set') {
      const newEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle("✅ Hatırlatma Kaydedildi")
        .setDescription("Sayın kullanıcımız, hatırlatma mesajınız kaydedilmiştir.\nEğer silmek istiyorsan lütfen **SİL** tuşuna tıkla!");

      await i.update({ embeds: [newEmbed], components: [row] });

      // DM gönder
      const dmEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📩 Hatırlatma Mesajınız")
        .setDescription(`**${reminderText}**\n⏰ Süre: ${args[0]}`);

      const dmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dm_delete').setLabel('Hatırlatmayı Sil').setStyle(ButtonStyle.Danger)
      );

      const dmMsg = await i.user.send({ embeds: [dmEmbed], components: [dmRow] }).catch(() => null);

      // Zamanlama
      const timeout = setTimeout(async () => {
        try {
          await i.user.send({
            embeds: [new EmbedBuilder()
              .setColor(0x00FF00)
              .setTitle("⏰ Hatırlatma Zamanı!")
              .setDescription(`Hatırlatma: **${reminderText}**`)]
          });
        } catch {}
      }, duration);

      if (dmMsg) {
        const dmCollector = dmMsg.createMessageComponentCollector({ time: duration });
        dmCollector.on('collect', async btn => {
          if (btn.customId === 'dm_delete') {
            clearTimeout(timeout);
            const deletedEmbed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle("❌ Hatırlatma İptal Edildi")
              .setDescription("Hatırlatma mesajınız iptal edildi!");
            await btn.update({ embeds: [deletedEmbed], components: [] });
          }
        });
      }
    }

    if (i.customId === 'remind_delete') {
      const deletedEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("❌ Hatırlatma Silindi")
        .setDescription("Hatırlatma mesajınız silindi.");
      await i.update({ embeds: [deletedEmbed], components: [] });
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = { aliases: ['hatirlat'] };
module.exports.help = { 
  name: 'hatırlat', 
  description: 'Üyenin yazdığı hatırlatma mesajını kaydeder, DM ile gönderir ve süre sonunda hatırlatır.' 
};
