const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');
const JailSystem = require('../models/JailSystem');

module.exports.run = async (client, message, args) => {
  const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  if (!isAdmin) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Yetki yok')]
    });
  }

  let data = await JailSystem.findOne({ guildId: message.guild.id });
  if (!data) data = await JailSystem.create({ guildId: message.guild.id });

  const sub = (args[0] || '').toLowerCase();

  // Ayarlar
  if (sub === 'log') {
    const ch = message.mentions.channels.first();
    if (!ch || ch.type !== ChannelType.GuildText) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Kanal etiketle')] });
    }
    data.settings.logChannelId = ch.id; await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Log ayarlandı').setDescription(`<#${ch.id}>`)] });
  }

  if (sub === 'staffrol') {
    const role = message.mentions.roles.first();
    if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Rol etiketle')] });
    data.settings.staffRoleId = role.id; await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Staff rolü ayarlandı').setDescription(`<@&${role.id}>`)] });
  }

  if (sub === 'jailrol') {
    const role = message.mentions.roles.first();
    if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Rol etiketle')] });
    data.settings.jailRoleId = role.id; await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Jail rolü ayarlandı').setDescription(`<@&${role.id}>`)] });
  }

  if (sub === 'kapat') {
    data.active = false; await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Jail sistemi kapatıldı')] });
  }

  if (!sub && data.active) {
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⚠️ Jail sistemi zaten aktif')] });
  }

  // Açılış onayı
  const embed = new EmbedBuilder()
    .setColor('Blue')
    .setTitle('🔒 Jail Sistemi')
    .setDescription('Jail sistemi açılmak üzere, onay veriyor musunuz?');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('jailsistem_onay').setLabel('EVET').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('jailsistem_reddet').setLabel('HAYIR').setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 15000
  });

  collector.on('collect', async i => {
    if (i.customId === 'jailsistem_onay') {
      await i.update({
        embeds: [new EmbedBuilder().setColor('Orange').setTitle('⏳ Sistem açılıyor...')],
        components: []
      });

      data.active = true; await data.save();

      await msg.edit({
        embeds: [new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Jail sistemi açıldı!')
          .setDescription('Komutlar:\n`g!jail <id/@üye>`\n`g!unjail <id/@üye>`\nAyarlar:\n`g!jail-sistemi log #kanal`\n`g!jail-sistemi staffrol @rol`\n`g!jail-sistemi jailrol @rol`\n`g!jail-sistemi kapat`')]
      });

      const logCh = message.guild.channels.cache.get(data.settings.logChannelId);
      if (logCh) {
        const logEmbed = new EmbedBuilder()
          .setColor('Green')
          .setTitle('🔒 Jail Sistemi Açıldı')
          .addFields({ name: 'Yetkili', value: message.author.tag })
          .setTimestamp();
        logCh.send({ embeds: [logEmbed] });
      }

      collector.stop();
    }

    if (i.customId === 'jailsistem_reddet') {
      await i.update({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Sistem reddedildi')],
        components: []
      });
      collector.stop();
    }
  });

  collector.on('end', async () => {
    try { await msg.edit({ components: [] }); } catch {}
  });
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'jail-sistemi' };
