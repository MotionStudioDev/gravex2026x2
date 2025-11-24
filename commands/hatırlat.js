const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Reminder = require('../models/Reminder');

module.exports.run = async (client, message, args) => {
  const reminderText = args.join(" ");
  if (!reminderText) {
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🚫 Hata")
        .setDescription("Hatırlatma mesajı yazmalısın! Örn: `g!hatırlat toplantı 20:00`")]
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle("📌 Hatırlatma Onayı")
    .setDescription(`**Dikkat:** Mesajınız hatırlatmak üzere kaydedilecektir.\n\n**Mesaj:** ${reminderText}\n\n✅ Onay vermek için **HATIRLATMA** tuşuna basınız.\n❌ İstemiyorsanız **HATIRLATMA İSTEMİYORUM** tuşuna tıklayınız.`);

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
        remindAt: null, // zamanlı değil, sadece içerik
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
        .setDescription(`**${reminderText}**`);

      const dmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dm_delete').setLabel('Hatırlatma İptal').setStyle(ButtonStyle.Danger)
      );

      const dmMsg = await i.user.send({ embeds: [dmEmbed], components: [dmRow] }).catch(() => null);

      if (dmMsg) {
        const dmCollector = dmMsg.createMessageComponentCollector({ time: 60000 });
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
  description: 'Üyenin yazdığı hatırlatma mesajını onaylı şekilde kaydeder ve DM ile gönderir.' 
};
