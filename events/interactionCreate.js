const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const BotList = require('../models/BotList');

module.exports = async (client, interaction) => {
  if (!interaction.isButton()) return;

  const parts = interaction.customId.split('_'); // bl_yes_guildId | bl_no_guildId | bl_close_guildId | bl_approve_guildId_botId_ownerId | bl_reject_...
  if (parts[0] !== 'bl') return;

  const action = parts[1];
  const guildId = parts[2];
  const data = await BotList.findOne({ guildId });
  if (!data) return;

  // Açma/kapama işlemleri (yalnızca admin)
  if (action === 'yes') {
    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (!isAdmin) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Yetki yok').setDescription('Sistemi yalnızca **Yönetici** açabilir.')], ephemeral: true });
    }
    data.active = true;
    await data.save();

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('✅ Bot List Sistemi Sunucuda aktif edildi')
      .setDescription(
        '**Komutlar:**\n' +
        '`g!bot-ekle <botID> <prefix> <açıklama>`\n\n' +
        '**Ayarlar (tek komut içinde):**\n' +
        '`g!botlist-sistemi log #kanal`\n' +
        '`g!botlist-sistemi submit #kanal`\n' +
        '`g!botlist-sistemi botrol @rol`\n' +
        '`g!botlist-sistemi devrol @rol`\n' +
        '`g!botlist-sistemi staffrol @rol`\n' +
        '`g!botlist-sistemi limit <sayı>`\n' +
        '`g!botlist-sistemi kapat`'
      );

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bl_close_${guildId}`).setLabel('Sistemi Kapat').setStyle(ButtonStyle.Danger)
    );

    return interaction.update({ embeds: [embed], components: [row] });
  }

  if (action === 'no') {
    return interaction.update({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Bot List sistemi deaktif')], components: [] });
  }

  if (action === 'close') {
    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (!isAdmin) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Yetki yok').setDescription('Sistemi yalnızca **Yönetici** kapatabilir.')], ephemeral: true });
    }
    data.active = false;
    await data.save();
    return interaction.update({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Sistem kapatıldı').setDescription('Bot List Sistemi sunucuda deaktif edildi.')], components: [] });
  }

  // Onay/Reddet (Yalnızca admin veya staff rol)
  if (action === 'approve' || action === 'reject') {
    if (!data.active) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⚠️ Sistem kapalı')], ephemeral: true });
    }

    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isStaff = data.settings.staffRoleId && interaction.member.roles.cache.has(data.settings.staffRoleId);
    if (!isAdmin && !isStaff) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Yetki yok').setDescription('Bu işlemi yalnızca **Yönetici** veya **Yetkili rol** yapabilir.')], ephemeral: true });
    }

    const botId = parts[3];
    const ownerId = parts[4];

    const idx = data.pending.findIndex(p => p.botId === botId && p.ownerId === ownerId);
    if (idx === -1) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Kayıt bulunamadı')], ephemeral: true });
    }

    const record = data.pending[idx];
    data.pending.splice(idx, 1);

    if (action === 'approve') {
      data.approved.push({ ...record, approvedAt: Date.now() });
      await data.save();

      // DM: onay
      try {
        const user = await client.users.fetch(ownerId);
        await user.send({
          embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Botun onaylandı').setDescription(`Bot ID: **${botId}**\nPrefix: \`${record.prefix}\`\nAçıklama: ${record.desc}`)]
        });
      } catch {}

      const updated = new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Onaylandı')
        .addFields(
          { name: 'Bot ID', value: botId, inline: true },
          { name: 'Sahip', value: `<@${ownerId}>`, inline: true },
          { name: 'Prefix', value: record.prefix, inline: true },
          { name: 'Açıklama', value: record.desc, inline: false }
        )
        .setFooter({ text: `Onaylayan: ${interaction.user.tag}` });

      return interaction.update({ embeds: [updated], components: [] });
    }

    if (action === 'reject') {
      await data.save();

      // DM: red
      try {
        const user = await client.users.fetch(ownerId);
        await user.send({
          embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Botun reddedildi').setDescription(`Bot ID: **${botId}** başvurun reddedildi.`)]
        });
      } catch {}

      const updated = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Reddedildi')
        .addFields(
          { name: 'Bot ID', value: botId, inline: true },
          { name: 'Sahip', value: `<@${ownerId}>`, inline: true }
        )
        .setFooter({ text: `Reddeden: ${interaction.user.tag}` });

      return interaction.update({ embeds: [updated], components: [] });
    }
  }
};
