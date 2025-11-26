const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const JailSystem = require('../models/JailSystem');

module.exports.run = async (client, message, args) => {
  const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  if (!isAdmin) return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Yetki yok')] });

  let data = await JailSystem.findOne({ guildId: message.guild.id });
  if (!data) data = await JailSystem.create({ guildId: message.guild.id });

  const sub = (args[0] || '').toLowerCase();

  // Ayarlar
  if (sub === 'log') {
    const ch = message.mentions.channels.first();
    if (!ch || ch.type !== ChannelType.GuildText) return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Kanal etiketle')] });
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

  const embed = new EmbedBuilder().setColor('Blue').setTitle('🔒 Jail Sistemi').setDescription('Jail sistemi açılmak üzere, onay veriyor musunuz?\nEVET/HAYIR yaz.');
  const msg = await message.channel.send({ embeds: [embed] });

  const filter = m => m.author.id === message.author.id;
  const collector = message.channel.createMessageCollector({ filter, time: 30000 });

  collector.on('collect', async m => {
    if (m.content.toLowerCase() === 'evet') {
      await msg.edit({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⏳ Sistem açılıyor..')] });
      setTimeout(async () => {
        data.active = true; await data.save();
        await msg.edit({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Jail sistemi açıldı!').setDescription('Komutlar:\n`g!jail <id/@üye>`\n`g!unjail <id/@üye>`\nAyarlar:\n`g!jail-sistemi log #kanal`\n`g!jail-sistemi staffrol @rol`\n`g!jail-sistemi jailrol @rol`\n`g!jail-sistemi kapat`')] });
      }, 2000);
      collector.stop();
    }
    if (m.content.toLowerCase() === 'hayir') {
      await msg.edit({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Sistem reddedildi')] });
      collector.stop();
    }
  });
};

module.exports.conf = { aliases: ['jailsistemi'] };
module.exports.help = { name: 'jail-sistemi' };
