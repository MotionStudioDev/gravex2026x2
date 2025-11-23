const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
const UserXP = require('../models/UserXP');
const { Rank } = require('canvacord');
const { createCanvas, loadImage } = require('canvas');

async function generateTopImage(message, topUsers) {
  const width = 800;
  const height = 100 + topUsers.length * 70;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Arka plan
  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#fff';
  ctx.font = '30px Sans';
  ctx.fillText('🏆 Sunucu Level Top 10', 20, 50);

  let y = 100;
  for (let i = 0; i < topUsers.length; i++) {
    const entry = topUsers[i];
    const member = await message.guild.members.fetch(entry.userId).catch(() => null);
    const username = member ? member.user.username : 'Bilinmeyen';
    const avatarURL = member ? member.user.displayAvatarURL({ extension: 'png', size: 64 }) : null;

    if (avatarURL) {
      const avatar = await loadImage(avatarURL);
      ctx.drawImage(avatar, 20, y - 40, 50, 50);
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = '24px Sans';
    ctx.fillText(`${i + 1}. ${username}`, 80, y);
    ctx.fillStyle = '#ccc';
    ctx.font = '20px Sans';
    ctx.fillText(`Level: ${entry.level} | XP: ${entry.xp}`, 300, y);

    y += 70;
  }

  return new AttachmentBuilder(canvas.toBuffer(), { name: 'top10.png' });
}

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

  const rank = new Rank()
    .setAvatar(user.displayAvatarURL({ extension: "png" }))
    .setCurrentXP(userXP.xp)
    .setRequiredXP(nextLevelXP)
    .setLevel(userXP.level)
    .setUsername(user.username)
    .setDiscriminator(user.discriminator)
    .setProgressBar("#5865F2", "COLOR")
    .setBackground("COLOR", "#2C2F33");

  const data = await rank.build();
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

        const rank = new Rank()
          .setAvatar(user.displayAvatarURL({ extension: "png" }))
          .setCurrentXP(refreshed.xp)
          .setRequiredXP(nextLevelXP)
          .setLevel(refreshed.level)
          .setUsername(user.username)
          .setDiscriminator(user.discriminator)
          .setProgressBar("#5865F2", "COLOR")
          .setBackground("COLOR", "#2C2F33");

        const data = await rank.build();
        const attachment = new AttachmentBuilder(data, { name: "rank.png" });

        await i.update({ files: [attachment], components: [row] });
      } else if (currentView === 'top') {
        const rawTop = await UserXP.find({ guildId: message.guild.id });
        const uniqueMap = new Map();

        for (const entry of rawTop) {
          const existing = uniqueMap.get(entry.userId);
          if (!existing || entry.level > existing.level || entry.xp > existing.xp) {
            uniqueMap.set(entry.userId, entry);
          }
        }

        const topUsers = [...uniqueMap.values()]
          .sort((a, b) => b.level - a.level || b.xp - a.xp)
          .slice(0, 10);

        const attachment = await generateTopImage(message, topUsers);
        await i.update({ files: [attachment], components: [row] });
      }
    }

    if (i.customId === 'level_top') {
      currentView = 'top';

      const rawTop = await UserXP.find({ guildId: message.guild.id });
      const uniqueMap = new Map();

      for (const entry of rawTop) {
        const existing = uniqueMap.get(entry.userId);
        if (!existing || entry.level > existing.level || entry.xp > existing.xp) {
          uniqueMap.set(entry.userId, entry);
        }
      }

      const topUsers = [...uniqueMap.values()]
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, 10);

      const attachment = await generateTopImage(message, topUsers);
      await i.update({ files: [attachment], components: [row] });
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = { aliases: ['rank', 'xp'] };
module.exports.help = { 
  name: 'level', 
  description: 'Kendi level bilgini ve Top listesini tek görselde gösterir.' 
};
