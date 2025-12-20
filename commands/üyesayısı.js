const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Nitro verileri ve sunucu istatistikleri taranıyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    const members = await message.guild.members.fetch();
    
    // --- TEMEL SAYILAR ---
    const totalMembers = message.guild.memberCount;
    const botCount = members.filter(m => m.user.bot).size;
    const humanCount = totalMembers - botCount;

    // --- AKTİFLİK DURUMU ---
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = totalMembers - (online + idle + dnd);

    // --- BOOST VE NİTRO HESAPLAMASI ---
    
    // 1. Toplam Boost Sayısı (Örn: 30 Basım)
    const totalBoosts = message.guild.premiumSubscriptionCount || 0;
    
    // 2. Takviye Yapan Kişi Sayısı (Örn: 13 Kişi)
    const boostingMembers = members.filter(m => m.premiumSince).size;

    // 3. NİTRO TESPİTİ (Senin istediğin özel kısım)
    // Mantık: Ya Boost basmıştır YA DA Hareketli Avatar (GIF) kullanıyordur.
    const nitroUsers = members.filter(m => {
        const isBoosting = m.premiumSince;
        const hasAnimatedAvatar = m.user.avatar && m.user.avatar.startsWith('a_');
        // Botları saymayalım, sadece insanlar
        return !m.user.bot && (isBoosting || hasAnimatedAvatar);
    }).size;

    const resultEmbed = new EmbedBuilder()
      .setColor('#f47fff') // Nitro pembesi
      .setAuthor({ name: `${message.guild.name} • Detaylı Analiz`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields(
        { 
          name: '👥 Üye Dağılımı', 
          value: `> **Toplam:** \`${totalMembers}\`\n> **Kullanıcı:** \`${humanCount}\`\n> **Bot:** \`${botCount}\``, 
          inline: true 
        },
        { 
          name: '💎 Nitro & Boost', 
          // Burada net bir şekilde ayırdık
          value: `> **Tespit Edilen Nitro:** \`${nitroUsers} Kişi\` (Yaklaşık)\n> **Takviye Yapan:** \`${boostingMembers} Kişi\`\n> **Toplam Boost:** \`${totalBoosts} Basım\``, 
          inline: false 
        },
        { 
          name: '🟢 Aktiflik', 
          value: `> 🟢 Çevrimiçi: \`${online}\`\n> 🌙 Boşta: \`${idle}\`\n> ⛔ Rahatsız Etmeyin: \`${dnd}\`\n> ⚫ Çevrimdışı: \`${offline}\``, 
          inline: false 
        }
      )
      .setFooter({ text: 'Not: Düz resim kullanan ve boost basmayan Nitro üyeleri görülemez.', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error(error);
    msg.edit({ content: '❌ Bir hata oluştu! Lütfen botun "Presence" ve "Server Members" izinlerini kontrol et.', embeds: [] });
  }
};

module.exports.conf = { aliases: ['say', 'stats'] };
module.exports.help = { name: 'üyesayısı' };
