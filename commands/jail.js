const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const JailSystem = require('../models/JailSystem');

module.exports.run = async (client, message, args) => {
  const data = await JailSystem.findOne({ guildId: message.guild.id });
  if (!data || !data.active) return message.channel.send({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⚠️ Jail sistemi kapalı')] });

  const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const isStaff = data.settings.staffRoleId && message.member.roles.cache.has(data.settings.staffRoleId);
  if (!isAdmin && !isStaff) return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Yetki yok')] });

  const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
  if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Kullanım: g!jail <id/@üye>')] });

  const embed = new EmbedBuilder().setColor('Blue').setTitle('🔒 Jail İşlemi').setDescription(`Bu kişi jail'e atılsın mı?\nEVET/HAYIR yaz.`);
  const msg = await message.channel.send({ embeds: [embed] });

  const filter = m => m.author.id === message.author.id;
  const collector = message.channel.createMessageCollector({ filter, time: 30000 });

  collector.on('collect', async m => {
    if (m.content.toLowerCase() === 'evet') {
      await msg.edit({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⏳ Jail atılıyor, lütfen bekle..')] });
      setTimeout(async () => {
        await member.roles.add(data.settings.jailRoleId).catch(() => {});
        data.jailed.push({ userId: member.id });
        await data.save();

        await msg.edit({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Jail atıldı')] });

        const logCh = message.guild.channels.cache.get(data.settings.logChannelId);
        if (logCh) {
          const logEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('🔒 Jail Atıldı')
            .addFields(
              { name: 'Kullanıcı', value: `${member.user.tag} (${member.id})`, inline: true },
              { name: 'Yetkili', value: message.author.tag, inline: true }
            )
            .setTimestamp();
          logCh.send({ embeds: [logEmbed] });
        }
      }, 2000);
      collector.stop();
    }
    if (m.content.toLowerCase() === 'hayir') {
      await msg.edit({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Bu kişi jail’e atılmadı')] });
      collector.stop();
    }
  });
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'jail' };
