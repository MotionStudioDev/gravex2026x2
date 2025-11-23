const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
const UserXP = require('../models/UserXP');
const { Rank } = require('canvacord');

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

        for (const entry of topUsers) {
          const member = await message.guild.members.fetch(entry.userId).catch(() => null);
          const username = member ? member.user.username : 'Bilinmeyen';
          const discriminator = member ? member.user.discriminator : '0000';
          const avatar = member ? member.user.displayAvatarURL({ extension: "png" }) : null;

          const rank = new Rank()
            .setAvatar(avatar || message.author.displayAvatarURL({ extension: "png" }))
            .setCurrentXP(entry.xp)
            .setRequiredXP(entry.level * 100)
            .setLevel(entry.level)
            .setUsername(username)
            .setDiscriminator(discriminator)
            .setProgressBar("#FFD700", "COLOR")
            .setBackground("COLOR", "#2C2F33");

          const data = await rank.build();
          const attachment = new AttachmentBuilder(data, { name: `top_${entry.userId}.png` });
          await message.channel.send({ files: [attachment] });
        }

        await i.update({ content: '🏆 Sunucu Level Top 10 listesi resimli olarak gönderildi.', components: [row] });
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

      for (const entry of topUsers) {
        const member = await message.guild.members.fetch(entry.userId).catch(() => null);
        const username = member ? member.user.username : 'Bilinmeyen';
        const discriminator = member ? member.user.discriminator : '0000';
        const avatar = member ? member.user.displayAvatarURL({ extension: "png" }) : null;

        const rank = new Rank()
          .setAvatar(avatar || message.author.displayAvatarURL({ extension: "png" }))
          .setCurrentXP(entry.xp)
          .setRequiredXP(entry.level * 100)
          .setLevel(entry.level)
          .setUsername(username)
          .setDiscriminator(discriminator)
          .setProgressBar("#FFD700", "COLOR")
          .setBackground("COLOR", "#2C2F33");

        const data = await rank.build();
        const attachment = new AttachmentBuilder(data, { name: `top_${entry.userId}.png` });
        await message.channel.send({ files: [attachment] });
      }

      await i.update({ content: '🏆 Sunucu Level Top 10 listesi resimli olarak gönderildi.', components: [row] });
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
  description: 'Kendi level bilgini ve Top listesini resimli kartlarla gösterir.' 
};
