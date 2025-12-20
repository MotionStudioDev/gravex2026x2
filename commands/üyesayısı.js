const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Veriler güncelleniyor ve hatalar taranıyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    // En güncel veriyi almak için fetch atıyoruz
    const members = await message.guild.members.fetch();
    
    // 1. ÜYE SAYILARI (Netleştirildi)
    const totalMembers = message.guild.memberCount; // Sunucudaki her şey
    const botCount = members.filter(m => m.user.bot).size; // Sadece botlar
    const humanCount = totalMembers - botCount; // Sadece gerçek insanlar

    // 2. AKTİFLİK DURUMU (Presence Intent Açık Olmalı)
    // mobilde mi webde mi ayrımı yapmadan genel durumlarına bakıyoruz
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = totalMembers - (online + idle + dnd);

    // 3. BOOST VE NİTRO VERİLERİ (Senin istediğin düzeltme burası)
    // premiumSubscriptionCount: Toplam kaç tane boost basılmış? (Örn: 30)
    // premiumTier: Sunucu kaçıncı seviye? (Örn: 3)
    const totalBoosts = message.guild.premiumSubscriptionCount || 0; 
    const serverLevel = message.guild.premiumTier;
    const boostingMembers = members.filter(m => m.premiumSince).size; // Kaç farklı kişi boost basmış?

    // 4. SES KANALLARINDAKİ ÜYELER
    // Sesteki toplam kişiyi sayar (Botlar dahil mi hariç mi diye ayırabiliriz, şimdilik genel toplam)
    const voiceCount = message.guild.members.cache.filter(m => m.voice.channel).size;

    const resultEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({ name: `${message.guild.name} • Sunucu İstatistikleri`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields(
        { 
          name: '👥 Genel Toplam', 
          value: `> **Toplam:** \`${totalMembers}\`\n> **İnsan:** \`${humanCount}\`\n> **Bot:** \`${botCount}\``, 
          inline: true 
        },
        { 
          name: '🟢 Durumlar', 
          value: `> 🟢 Çevrimiçi: \`${online}\`\n> 🌙 Boşta: \`${idle}\`\n> ⛔ R. Etmeyin: \`${dnd}\`\n> ⚫ Çevrimdışı: \`${offline}\``, 
          inline: true 
        },
        { 
          name: '🚀 Boost Bilgileri (Düzeltildi)', 
          // Burada hatanı çözdük: Hem seviyeyi hem toplam sayıyı ayrı ayrı yazıyoruz.
          value: `> **Toplam Boost:** \`${totalBoosts}\` (Adet)\n> **Takviyeci:** \`${boostingMembers}\` (Kişi)\n> **Seviye:** \`Level ${serverLevel}\``, 
          inline: false 
        },
        {
          name: '🎙️ Ses Durumu',
          value: `> Şu an seste **${voiceCount}** üye sohbette.`,
          inline: false
        }
      )
      .setFooter({ text: `İsteyen: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder()
      .setColor('Red')
      .setDescription('❌ Veriler çekilirken bir hata oluştu. Lütfen botun yetkilerini kontrol et.');
    
    await msg.edit({ embeds: [errorEmbed] });
  }
};

module.exports.conf = {
  aliases: ['say', 'istatistik', 'info']
};

module.exports.help = {
  name: 'üyesayısı'
};
