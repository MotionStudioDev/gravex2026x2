const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports.run = async (client, message, args) => {
  // Yazıyor... efekti
  await message.channel.sendTyping();

  const loadingEmbed = new EmbedBuilder()
    .setColor('#2F3136')
    .setDescription('📡 **Grave Veri Merkezi:** Sunucu haritası çıkarılıyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  const getStatsData = async (guild) => {
    const members = await guild.members.fetch({ withPresences: true }).catch(() => guild.members.cache);
    
    const total = guild.memberCount;
    const bots = members.filter(m => m.user.bot).size;
    const humans = total - bots;
    
    // Durumlar
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = total - (online + idle + dnd);

    // Boost & Nitro
    const totalBoosts = guild.premiumSubscriptionCount || 0;
    const boostingMembers = members.filter(m => m.premiumSince).size;
    const tier = guild.premiumTier;

    return { total, bots, humans, online, idle, dnd, offline, totalBoosts, boostingMembers, tier };
  };

  const buildEmbed = (guild, s) => {
    return new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({ 
        name: `${guild.name} | Sunucu Analizi`, 
        iconURL: guild.iconURL({ dynamic: true }) 
      })
      .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
      .setDescription(`> Sunucunun anlık verileri aşağıda tablolanmıştır. Veriler her **60 saniyede bir** güncellenebilir.`)
      .addFields(
        { 
          name: '👤 Üyeler', 
          value: `\`\`\`\nToplam: ${s.total}\nİnsan: ${s.humans}\nBotlar: ${s.bots}\`\`\``, 
          inline: true 
        },
        { 
          name: '🚦 Durumlar', 
          value: `\`\`\`\nAktif: ${s.online}\nBoşta: ${s.idle}\nDND  : ${s.dnd}\nKapalı: ${s.offline}\`\`\``, 
          inline: true 
        },
        { 
          name: '💎 Takviye Durumu', 
          value: `> **Seviye:** \`Level ${s.tier}\`\n> **Toplam Boost:** \`${s.totalBoosts}\` Adet\n> **Takviyeci:** \`${s.boostingMembers}\` Kişi`, 
          inline: false 
        }
      )
      .setImage('https://i.imgur.com/vHqLhWv.png') // Buraya sunucuna özel bir banner linki de koyabilirsin
      .setFooter({ text: `Sorgulayan: ${message.author.tag} • Grave Analiz`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();
  };

  // Butonlar
  const refreshBtn = new ButtonBuilder()
    .setCustomId('refresh')
    .setLabel('Yenile')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Success);

  const detailBtn = new ButtonBuilder()
    .setCustomId('details')
    .setLabel('Rol Dağılımı')
    .setEmoji('📋')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(refreshBtn, detailBtn);

  try {
    const stats = await getStatsData(message.guild);
    await msg.edit({ embeds: [buildEmbed(message.guild, stats)], components: [row] });

    const collector = msg.createMessageComponentCollector({ 
      componentType: ComponentType.Button, 
      time: 120000 
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: '❌ Bu butonları sadece komutu yazan kullanabilir.', ephemeral: true });
      }

      if (i.customId === 'refresh') {
        await i.update({ 
          embeds: [new EmbedBuilder().setColor('Yellow').setDescription('🔄 **Veriler tazeleniyor...**') ],
          components: [new ActionRowBuilder().addComponents(ButtonBuilder.from(refreshBtn).setDisabled(true), detailBtn)] 
        });

        const newStats = await getStatsData(message.guild);
        await i.editReply({ embeds: [buildEmbed(message.guild, newStats)], components: [row] });
      }

      if (i.customId === 'details') {
        const topRoles = message.guild.roles.cache
          .filter(r => r.name !== '@everyone')
          .sort((a, b) => b.members.size - a.members.size)
          .first(5);

        const roleDesc = topRoles.map(r => `**${r.name}:** \`${r.members.size}\` üye`).join('\n');
        
        await i.reply({ 
          content: `📊 **En Çok Üyeye Sahip 5 Rol:**\n${roleDesc}`, 
          ephemeral: true 
        });
      }
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });

  } catch (err) {
    console.error(err);
    message.reply('❌ Veriler işlenirken bir hata oluştu.');
  }
};

module.exports.conf = { aliases: ['say', 'üye-bilgi'] };
module.exports.help = { name: 'üyesayısı' };
