const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports.run = async (client, message, args) => {
  // Verileri çekme fonksiyonu
  const getStats = async (guild) => {
    // withPresences: true çevrimiçi sayımı için kritik
    const members = await guild.members.fetch({ withPresences: true });
    
    const total = guild.memberCount;
    const bots = members.filter(m => m.user.bot).size;
    const humans = total - bots;
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = total - (online + idle + dnd);
    const boosts = guild.premiumSubscriptionCount || 0;
    const nitroCount = members.filter(m => !m.user.bot && m.premiumSince).size;

    return { total, bots, humans, online, idle, dnd, offline, boosts, nitroCount, tier: guild.premiumTier };
  };

  const createEmbed = (guild, s) => {
    return new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`📊 ${guild.name} - Üye İstatistikleri`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '👥 Üye Dağılımı', value: `> Toplam: \`${s.total}\`\n> İnsan: \`${s.humans}\`\n> Bot: \`${s.bots}\``, inline: true },
        { name: '🟢 Aktiflik', value: `> Çevrimiçi: \`${s.online}\`\n> Boşta: \`${s.idle}\`\n> R. Etmeyin: \`${s.dnd}\``, inline: true },
        { name: '💎 Takviye & Nitro', value: `> Toplam Boost: \`${s.boosts}\` Adet\n> Takviyeci: \`${s.nitroCount}\` Kişi\n> Seviye: \`Level ${s.tier}\``, inline: false }
      )
      .setFooter({ text: 'Verileri güncellemek için butonu kullanın.', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
  };

  // Butonları oluştururken ActionRow içine koyduğumuzdan emin oluyoruz
  const refreshButton = new ButtonBuilder()
    .setCustomId('refresh_stats')
    .setLabel('Verileri Güncelle')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Primary);

  const botButton = new ButtonBuilder()
    .setCustomId('bot_list')
    .setLabel('Bot Sayısı')
    .setEmoji('🤖')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(refreshButton, botButton);

  try {
    const s = await getStats(message.guild);
    const msg = await message.channel.send({ 
      embeds: [createEmbed(message.guild, s)], 
      components: [row] // components bir dizi (array) olmalı ve içinde ActionRow olmalı
    });

    const collector = msg.createMessageComponentCollector({ 
      componentType: ComponentType.Button, 
      time: 60000 
    });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: '❌ Bu işlemi sadece komutu yazan kişi yapabilir.', ephemeral: true });
      }

      if (i.customId === 'refresh_stats') {
        // Güncelleniyor efekti için butonu devre dışı bırakıp güncelle
        await i.deferUpdate(); 
        const updatedStats = await getStats(message.guild);
        await i.editReply({ 
          embeds: [createEmbed(message.guild, updatedStats)], 
          components: [row] 
        });
      }

      if (i.customId === 'bot_list') {
        const stats = await getStats(message.guild);
        await i.reply({ content: `🤖 Sunucuda şu an toplam **${stats.bots}** bot bulunuyor.`, ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        refreshButton.setDisabled(true),
        botButton.setDisabled(true)
      );
      msg.edit({ components: [disabledRow] }).catch(() => {});
    });

  } catch (err) {
    console.error(err);
    message.reply('❌ Veriler çekilirken bir hata oluştu.');
  }
};

module.exports.conf = { aliases: ['say'] };
module.exports.help = { name: 'üyesayısı' };
