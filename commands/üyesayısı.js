const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports.run = async (client, message, args) => {
  // Bot yazıyor...
  await message.channel.sendTyping();

  const getStatsData = async (guild) => {
    // Statüleri çekebilmek için fetch
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

  const buildMainEmbed = (guild, s) => {
    return new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({ name: `${guild.name} | Sunucu Analizi`, iconURL: guild.iconURL({ dynamic: true }) })
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '👥 Üyeler', value: `\`\`\`fix\nToplam: ${s.total}\nİnsan: ${s.humans}\nBotlar: ${s.bots}\`\`\``, inline: true },
        { name: '🚦 Durumlar', value: `\`\`\`yaml\nAktif: ${s.online}\nBoşta: ${s.idle}\nDND  : ${s.dnd}\nKapalı: ${s.offline}\`\`\``, inline: true },
        { name: '💎 Takviye Durumu', value: `> **Seviye:** \`Level ${s.tier}\` | **Boost:** \`${s.totalBoosts}\` Adet\n> **Takviyeci:** \`${s.boostingMembers}\` Kişi`, inline: false }
      )
      .setFooter({ text: `Güncellendi: ${new Date().toLocaleTimeString('tr-TR')}`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
  };

  // Butonları hazırlıyoruz
  const refreshBtn = new ButtonBuilder().setCustomId('refresh').setLabel('Yenile').setEmoji('🔄').setStyle(ButtonStyle.Success);
  const detailBtn = new ButtonBuilder().setCustomId('details').setLabel('Rol Dağılımı').setEmoji('📋').setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder().addComponents(refreshBtn, detailBtn);

  try {
    const stats = await getStatsData(message.guild);
    const msg = await message.channel.send({ embeds: [buildMainEmbed(message.guild, stats)], components: [row] });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: '❌ Bu işlemi sadece komutu yazan kişi yapabilir.', ephemeral: true });
      }

      if (i.customId === 'refresh') {
        // Önce "Tazeleniyor" mesajına çevir
        await i.update({ 
          embeds: [new EmbedBuilder().setColor('Yellow').setDescription('🔄 **Veriler tazeleniyor, lütfen bekleyin...**') ],
          components: [new ActionRowBuilder().addComponents(ButtonBuilder.from(refreshBtn).setDisabled(true), detailBtn)] 
        });

        // Verileri tekrar çek
        const newStats = await getStatsData(message.guild);

        // Düzenlenen mesajı yeni verilerle güncelle (Buradaki hata fixlendi)
        await i.editReply({ 
          embeds: [buildMainEmbed(message.guild, newStats)], 
          components: [row] 
        });
      }

      if (i.customId === 'details') {
        // Rol dağılımını Embed olarak hazırla
        const topRoles = message.guild.roles.cache
          .filter(r => r.name !== '@everyone' && !r.managed) // bot rollerini ve everyone'ı gizle
          .sort((a, b) => b.members.size - a.members.size)
          .first(10); // İlk 10 rol

        const roleEmbed = new EmbedBuilder()
          .setColor('#2F3136')
          .setTitle('📊 En Çok Üyeye Sahip Roller')
          .setDescription(topRoles.map((r, index) => `**${index + 1}.** ${r} — \`${r.members.size}\` üye`).join('\n') || "Rol bulunamadı.")
          .setFooter({ text: 'Bu liste sadece size özeldir.' });

        await i.reply({ embeds: [roleEmbed], ephemeral: true });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        refreshBtn.setDisabled(true),
        detailBtn.setDisabled(true)
      );
      msg.edit({ components: [disabledRow] }).catch(() => {});
    });

  } catch (err) {
    console.error(err);
    message.reply('❌ Veriler işlenirken bir hata oluştu.');
  }
};

module.exports.conf = { aliases: ['say'] };
module.exports.help = { name: 'üyesayısı' };
