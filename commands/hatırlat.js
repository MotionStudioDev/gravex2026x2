const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Reminder = require('../models/Reminder');

function parseDuration(str) {
  const match = str.match(/(\d+)([smhd])/);
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
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle("🚫 Hata").setDescription("Doğru kullanım: `g!hatırlat <süre> <mesaj>`")] });
  }

  const duration = parseDuration(args[0]);
  if (!duration) return message.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle("🚫 Hata").setDescription("Süre formatı yanlış! Örn: `10m`, `2h`, `30s`, `1d`")] });

  const reminderText = args.slice(1).join(" ");
  const remindAt = new Date(Date.now() + duration);

  const reminder = await Reminder.create({
    guildId: message.guild.id,
    userId: message.author.id,
    message: reminderText,
    remindAt
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📌 Hatırlatma Mesajı")
    .setDescription(`**${reminderText}**\n⏰ Süre: ${args[0]}`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('remind_delete').setLabel('SİL').setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({ time: 60000 });
  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });

    if (i.customId === 'remind_delete') {
      reminder.status = 'deleted';
      await reminder.save();
      const deletedEmbed = new EmbedBuilder().setColor(0xFF0000).setTitle("❌ Hatırlatma Silindi").setDescription("Hatırlatma mesajınız silindi.");
      await i.update({ embeds: [deletedEmbed], components: [] });
    }
  });
};
