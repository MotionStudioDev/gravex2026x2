const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const BotList = require('../models/BotList');

module.exports.run = async (client, message, args) => {
  const data = await BotList.findOne({ guildId: message.guild.id });
  if (!data || !data.active) {
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⚠️ Sistem kapalı')] });
  }

  if (!data.settings.submitChannelId || !data.settings.logChannelId) {
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Eksik ayar').setDescription('`submit` ve `log` kanallarını ayarlayın:\n`g!botlist-sistemi submit #kanal`\n`g!botlist-sistemi log #kanal`')] });
  }

  if (message.channel.id !== data.settings.submitChannelId) {
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⚠️ Yanlış kanal').setDescription(`Başvuru sadece <#${data.settings.submitChannelId}> kanalında yapılabilir.`)] });
  }

  const botId = args[0];
  const prefix = args[1];
  const desc = args.slice(2).join(' ');
  if (!botId || !/^\d{17,20}$/.test(botId) || !prefix || !desc) {
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Hatalı kullanım').setDescription('`g!bot-ekle <botID> <prefix> <açıklama>`')] });
  }

  // Limit kontrolü (onaylı bot sayısı)
  const ownerApprovedCount = (data.approved || []).filter(b => b.ownerId === message.author.id).length;
  if (ownerApprovedCount >= data.settings.botInviteLimit) {
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⚠️ Limit aşıldı').setDescription(`Maksimum **${data.settings.botInviteLimit}** onaylı bot ekleyebilirsin.`)] });
  }

  // Başvuru embed + buton
  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle('📝 Yeni Bot Başvurusu')
    .addFields(
      { name: 'Bot ID', value: botId, inline: true },
      { name: 'Prefix', value: prefix, inline: true },
      { name: 'Sahip', value: `<@${message.author.id}>`, inline: true },
      { name: 'Açıklama', value: desc, inline: false }
    )
    .setFooter({ text: `Başvuru: ${new Date().toLocaleString('tr-TR')}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bl_approve_${message.guild.id}_${botId}_${message.author.id}`).setLabel('Onayla').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`bl_reject_${message.guild.id}_${botId}_${message.author.id}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
  );

  const logCh = message.guild.channels.cache.get(data.settings.logChannelId);
  if (!logCh) {
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Log kanalı bulunamadı').setDescription('`g!botlist-sistemi log #kanal` ile ayarla.')] });
  }

  await logCh.send({ embeds: [embed], components: [row] });

  // Pending’e ekle
  data.pending.push({ botId, ownerId: message.author.id, prefix, desc });
  await data.save();

  // Başvuru alındı bilgisi
  return message.channel.send({
    embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Başvuru alındı').setDescription('Yetkililer karar verdiğinde DM ile bilgilendirileceksin.')]
  });
};

module.exports.conf = { aliases: ['bot-ekle'] };
module.exports.help = { name: 'bot-ekle' };
