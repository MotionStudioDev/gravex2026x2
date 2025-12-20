const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports.run = async (client, message, args) => {
  // İlk yükleme mesajı
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Veriler analiz ediliyor, lütfen bekleyin...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  // İstatistik fonksiyonunu basitleştirdik ve hızlandırdık
  const getStatsData = async (guild) => {
    // Büyük sunucularda timeoutu engellemek için cache + fetch hibrit kullanımı
    const members = await guild.members.fetch({ withPresences: true }).catch(() => guild.members.cache);
    
    const total = guild.memberCount;
    const bots = members.filter(m => m.user.bot).size;
    const humans = total - bots;
    
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = total - (online + idle + dnd);

    const totalBoosts = guild.premiumSubscriptionCount || 0;
    const boostingMembers = members.filter(m => m.premiumSince).size;

    return { total, bots, humans, online, idle, dnd, offline, totalBoosts, boostingMembers, tier: guild.premiumTier };
  };

  const buildEmbed = (guild, s) => {
    return new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({ name: `${guild.name} Sunucu İstatistikleri`, iconURL: guild.iconURL({ dynamic: true }) })
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '👥 Üyeler', value: `> Toplam: \`${s.total}\`\n> İnsan: \`${s.humans}\`\n> Bot: \`${s.bots}\``, inline: true },
        { name: '🟢 Aktiflik', value: `> Online: \`${s.online}\`\n> Boşta: \`${s.idle}\`\n> DND: \`${s.dnd}\``, inline: true },
        { name: '💎 Takviye', value: `> Boost: \`${s.totalBoosts}\` (Lvl ${s.tier})\n> Takviyeci: \`${s.boostingMembers}\``, inline: false }
      )
      .setFooter({ text: `Güncelleyen: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();
  };

  // Butonu tekrar tanımlıyoruz
  const refreshBtn = new ButtonBuilder()
    .setCustomId('refresh_stats')
    .setLabel('Verileri Güncelle')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(refreshBtn);

  try {
    const stats = await getStatsData(message.guild);
    await msg.edit({ embeds: [buildEmbed(message.guild, stats)], components: [row] });

    // --- BUTON TOPLAYICISI (COLLECTOR) ---
    const collector = msg.createMessageComponentCollector({ 
      componentType: ComponentType.Button, 
      time: 60000 // Buton 1 dakika boyunca aktif kalır
    });

    collector.on('collect', async (i) => {
      // Sadece komutu yazan basabilsin
      if (i.user.id !== message.author.id) {
        return i.reply({ content: '❌ Bu butonu sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
      }

      try {
        // 1. Önce butona tıklandığını onayla (Discord hata vermesin)
        await i.deferUpdate();

        // 2. Yeni verileri çek
        const newStats = await getStatsData(message.guild);

        // 3. Mesajı güncelle
        await i.editReply({ 
          embeds: [buildEmbed(message.guild, newStats)], 
          components: [row] 
        });
      } catch (err) {
        console.error('Buton güncelleme hatası:', err);
      }
    });

    collector.on('end', () => {
      // Süre bittiğinde butonu kapat
      const disabledRow = new ActionRowBuilder().addComponents(refreshBtn.setDisabled(true));
      msg.edit({ components: [disabledRow] }).catch(() => {});
    });

  } catch (err) {
    console.error('Genel hata:', err);
    message.reply('❌ Bir hata oluştu, lütfen bot yetkilerini kontrol edin.');
  }
};

module.exports.conf = { aliases: ['say'] };
module.exports.help = { name: 'üyesayısı' };
