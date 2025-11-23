const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
const UserXP = require('../models/UserXP');
const canvacord = require('canvacord');

module.exports.run = async (client, message, args) => {
  const settings = await GuildSettings.findOne({ guildId: message.guild.id });
  if (!settings || !settings.levelSystemActive) {
    return message.channel.send({
      embeds: [
        {
          color: 0xFF0000,
          title: '🚫 Level Sistemi Kapalı',
          description: 'Bu sunucuda level sistemi aktif değil.'
        }
      ]
    });
  }

  const user = message.author;
  const userXP = await UserXP.findOne({ guildId: message.guild.id, userId: user.id }) || { xp: 0, level: 1 };
  const nextLevelXP = userXP.level * 100;

  // ✅ Rank kartı oluştur (Canvas.rank)
  const data = await canvacord.Canvas.rank({
    avatar: user.displayAvatarURL({ extension: "png" }),
    currentXP: userXP.xp,
    requiredXP: nextLevelXP,
    level: userXP.level,
    username: user.username,
    discriminator: user.discriminator,
    status: "online",
    bar: { color: "#5865F2" },
    background: "COLOR"
  });

  const attachment = new AttachmentBuilder(data, { name: "rank.png" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('level_refresh').setLabel('Yenile').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('level_top').setLabel('Level-Top').setStyle(ButtonStyle.Success)
  );

  const msg = await message.channel.send({ files: [attachment], components: [row] });

  let currentView = 'user';

  const collector = msg.createMessageComponentCollector({ time: 30000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: 'Bu butonları sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
    }

    if (i.customId === 'level_refresh') {
      if (currentView === 'user') {
        const refreshed = await UserXP.findOne({ guildId: message.guild.id, userId: user.id }) || { xp: 0, level: 1 };
        const nextLevelXP = refreshed.level * 100;

        const data = await canvacord.Canvas.rank({
          avatar: user.displayAvatarURL({ extension: "png" }),
          currentXP: refreshed.xp,
          requiredXP: nextLevelXP,
          level: refreshed.level,
          username: user.username,
          discriminator: user.discriminator,
          status: "online",
          bar: { color: "#5865F2" },
          background: "COLOR"
        });

        const attachment = new AttachmentBuilder(data, { name: "rank.png" });
        await i.update({ files: [attachment], components: [row] });
      } else if (currentView === 'top') {
        const topUsers = await UserXP.find({ guildId: message.guild.id })
          .sort({ level: -1, xp: -1 })
          .limit(10);

        let desc = '';
        for (let j = 0; j < topUsers.length; j++) {
          const u = await message.guild.members.fetch(topUsers[j].userId).catch(() => null);
          const name = u ? u.user.tag : topUsers[j].userId;
          let medal = '';
          if (j === 0) medal = '🥇 ';
          else if (j === 1) medal = '🥈 ';
          else if (j === 2) medal = '🥉 ';
          desc += `${medal}**${j + 1}.** ${name} — Level: ${topUsers[j].level}, XP: ${topUsers[j].xp}\n`;
        }

        await i.update({
          embeds: [{
            color: 0xFFD700,
            title: '🏆 Sunucu Level Top 10 (Yenilendi)',
            description: desc || 'Henüz hiçbir kullanıcı XP kazanmamış.',
            footer: { text: 'Sunucudaki en yüksek level kullanıcıları listeleniyor.' },
            timestamp: new Date()
          }],
          components: [row]
        });
      }
    }

    if (i.customId === 'level_top') {
      currentView = 'top';
      const topUsers = await UserXP.find({ guildId: message.guild.id })
        .sort({ level: -1, xp: -1 })
        .limit(10);

      let desc = '';
      for (let j = 0; j < topUsers.length; j++) {
        const u = await message.guild.members.fetch(topUsers[j].userId).catch(() => null);
        const name = u ? u.user.tag : topUsers[j].userId;
        let medal = '';
        if (j === 0) medal = '🥇 ';
        else if (j === 1) medal = '🥈 ';
        else if (j === 2) medal = '🥉 ';
        desc += `${medal}**${j + 1}.** ${name} — Level: ${topUsers[j].level}, XP: ${topUsers[j].xp}\n`;
      }

      await i.update({
        embeds: [{
          color: 0xFFD700,
          title: '🏆 Sunucu Level Top 10',
          description: desc || 'Henüz hiçbir kullanıcı XP kazanmamış.',
          footer: { text: 'Sunucudaki en yüksek level kullanıcıları listeleniyor.' },
          timestamp: new Date()
        }],
        components: [row]
      });
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch (err) {}
  });
};

module.exports.conf = { aliases: ['rank', 'xp'] };
module.exports.help = { 
  name: 'level', 
  description: 'Kendi level bilgini resimli kartla gösterir, Yenile ve Top butonlarıyla etkileşim sağlar.' 
};
