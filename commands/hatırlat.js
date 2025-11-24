const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Reminder = require('../models/Reminder');

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
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

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (60 * 1000)) % 60;
  const hr = Math.floor(ms / (60 * 60 * 1000)) % 24;
  const day = Math.floor(ms / (24 * 60 * 60 * 1000));

  let parts = [];
  if (day) parts.push(`${day} gün`);
  if (hr) parts.push(`${hr} saat`);
  if (min) parts.push(`${min} dakika`);
  if (sec) parts.push(`${sec} saniye`);
  return parts.join(', ');
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
        .setDescription("Süre formatı yanlış! Örn: `10s`, `5m`, `2h`, `1d`")]
    });
  }

  const reminderText = args.slice(1).join(" ");
  const remindAt = new Date(Date.now() + duration);

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle("📌 Hatırlatma Onayı")
    .setDescription(`**Dikkat:** Mesajınız hatırlatmak üzere kaydedilecektir.\n\n⏰ Süre: ${args[0]} (${formatDuration(duration)})\n📝 Mesaj: ${reminderText}\n\n✅ Onay vermek için **HATIRLATMA** tuşuna basınız.\n❌ İstemiyorsanız **HATIRLATMA İSTEMİYORUM** tuşuna tıklayınız.`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('remind_confirm').setLabel('HATIRLATMA').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('remind_cancel').setLabel('HATIRLATMA İSTEMİYORUM').setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    if (i.customId === 'remind_cancel') {
      const cancelEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("❌ Hatırlatma İptal Edildi")
        .setDescription("Hatırlatma mesajınız kaydedilmedi.");
      await i.update({ embeds: [cancelEmbed], components: [] });
      return;
    }

    if (i.customId === 'remind_confirm') {
      const reminder = await Reminder.create({
        guildId: message.guild.id,
        userId: message.author.id,
        message: reminderText,
        remindAt,
        status: 'active'
      });

      const confirmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle("✅ Hatırlatma Kaydedildi")
        .setDescription("Değerli üye, hatırlatma mesajınızın içeriği DM'den iletilmiştir.");
      await i.update({ embeds: [confirmEmbed], components: [] });

      const dmEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📩 Hatırlatma Mesajınız")
        .setDescription(`**${reminderText}**\n⏰ Süre: ${args[0]} (${formatDuration(duration)})`);

      const dmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dm_delete').setLabel('Hatırlatma İptal').setStyle(ButtonStyle.Danger)
      );

      const dmMsg = await i.user.send({ embeds: [dmEmbed], components: [dmRow] }).catch(() => null);

      if (dmMsg) {
        const dmCollector = dmMsg.createMessageComponentCollector({ time: duration });
        dmCollector.on('collect', async btn => {
          if (btn.customId === 'dm_delete') {
            reminder.status = 'deleted';
            await reminder.save();
            const deletedEmbed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle("❌ Hatırlatma Silindi")
              .setDescription("Hatırlatma mesajınız veri tabanından silinmiştir.");
            await btn.update({ embeds: [deletedEmbed], components: [] });
          }
        });
      }
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
  description: 'Zamanlamalı ve onaylı hatırlatma mesajı gönderir, DM ile iletir ve iptal edilebilir.' 
};
