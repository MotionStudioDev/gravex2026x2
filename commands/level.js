const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
const UserXP = require('../models/UserXP');

module.exports.run = async (client, message, args) => {
  const settings = await GuildSettings.findOne({ guildId: message.guild.id });
  if (!settings || !settings.levelSystemActive) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Level Sistemi Kapalı')
          .setDescription('Bu sunucuda level sistemi aktif değil.')
      ]
    });
  }

  const user = message.author;
  const userXP = await UserXP.findOne({ guildId: message.guild.id, userId: user.id });
  const nextLevelXP = userXP ? userXP.level * 100 : 100;

  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle(`📊 ${user.username} Level Bilgisi`)
    .addFields(
      { name: 'Level', value: `${userXP ? userXP.level : 1}`, inline: true },
      { name: 'XP', value: `${userXP ? userXP.xp : 0}/${nextLevelXP}`, inline: true }
    )
    .setFooter({ text: 'Bu sunucuda Level Sistemi aktif. XP kazanmak için mesaj atmaya devam et!' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('level_refresh').setLabel('Yenile').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('level_top').setLabel('Level-Top').setStyle(ButtonStyle.Success)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  let currentView = 'user'; // başlangıçta kullanıcı bilgisi

  const collector = msg.createMessageComponentCollector({ time: 30000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: 'Bu butonları sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
    }

    if (i.customId === 'level_refresh') {
      if (currentView === 'user') {
        // Kullanıcı bilgisini yenile
        const refreshed = await UserXP.findOne({ guildId: message.guild.id, userId: user.id });
        const refreshedEmbed = new EmbedBuilder()
          .setColor('Blurple')
          .setTitle(`📊 ${user.username} Level Bilgisi (Yenilendi)`)
          .addFields(
            { name: 'Level', value: `${refreshed ? refreshed.level : 1}`, inline: true },
            { name: 'XP', value: `${refreshed ? refreshed.xp : 0}/${refreshed ? refreshed.level * 100 : 100}`, inline: true }
          )
          .setFooter({ text: 'Bu sunucuda Level Sistemi aktif. XP kazanmak için mesaj atmaya devam et!' })
          .setTimestamp();

        await i.update({ embeds: [refreshedEmbed], components: [row] });
      } else if (currentView === 'top') {
        // Top listesini yenile
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

        const topEmbed = new EmbedBuilder()
          .setColor('Gold')
          .setTitle('🏆 Sunucu Level Top 10 (Yenilendi)')
          .setDescription(desc || 'Henüz hiçbir kullanıcı XP kazanmamış.')
          .setFooter({ text: 'Sunucudaki en yüksek level kullanıcıları listeleniyor.' })
          .setTimestamp();

        await i.update({ embeds: [topEmbed], components: [row] });
      }
    }

    if (i.customId === 'level_top') {
      currentView = 'top'; // state değiştir
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

      const topEmbed = new EmbedBuilder()
        .setColor('Gold')
        .setTitle('🏆 Sunucu Level Top 10')
        .setDescription(desc || 'Henüz hiçbir kullanıcı XP kazanmamış.')
        .setFooter({ text: 'Sunucudaki en yüksek level kullanıcıları listeleniyor.' })
        .setTimestamp();

      await i.update({ embeds: [topEmbed], components: [row] });
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] }); // süre dolunca butonları kaldır
    } catch (err) {
      // mesaj silinmişse hata yutulur
    }
  });
};

// komut ayarları
module.exports.conf = { aliases: ['rank', 'xp'] };
module.exports.help = { 
  name: 'level', 
  description: 'Kendi level bilgini gösterir, Yenile ve Top butonlarıyla etkileşim sağlar.' 
};
