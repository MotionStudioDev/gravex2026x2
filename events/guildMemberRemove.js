const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = async (member) => {
  const guildId = member.guild.id;
  const client = member.client;
  const now = Date.now(); // Çıkış zamanı

  if (member.user.bot) return; // Botlar için Last Seen kaydı tutmaya gerek yok

//////

  const settings = await GuildSettings.findOne({ guildId });
  if (!settings || !settings.sayaçHedef) return;

  // ⬇️ MEVCUT SAYAÇ SİSTEMİ BAŞLANGICI

  const mevcut = member.guild.memberCount;
  const kalan = settings.sayaçHedef - mevcut;

  const embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('📉 Bir Üye Ayrıldı')
    .setDescription(`**${member.user.tag}** sunucudan ayrıldı.\nHedefe ulaşmak için **${kalan}** kişi kaldı.`)
    .setFooter({ text: 'Grave Sayaç sistemi' })
    .setTimestamp();

  const kanal = settings.sayaçKanal
    ? member.guild.channels.cache.get(settings.sayaçKanal)
    : member.guild.systemChannel;

  if (kanal && kanal.permissionsFor(member.guild.members.me).has('SendMessages')) {
    kanal.send({ embeds: [embed] });
  }
};
