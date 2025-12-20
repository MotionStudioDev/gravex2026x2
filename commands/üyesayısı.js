const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  // Verileri analiz ediyoruz mesajı
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Sunucu verileri analiz ediliyor, lütfen bekleyin...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    // Tüm üyeleri önbelleğe çekelim (en güncel veri için)
    const members = await message.guild.members.fetch();
    
    // Genel Sayılar
    const totalMembers = message.guild.memberCount;
    const botCount = members.filter(m => m.user.bot).size;
    const humanCount = totalMembers - botCount;

    // Statü Sayıları
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = totalMembers - (online + idle + dnd);

    // Nitro Sayısı (Sunucuya takviye yapanlar)
    // Botlar hariç nitromu kullanıcıları sayalım
    const nitroCount = members.filter(m => 
      !m.user.bot &&  // Bot değilse
      m.premiumSince &&  // premiumSince var mı
      m.premiumSince instanceof Date  // Geçerli bir tarih mı
    ).size;

    const resultEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`📊 ${message.guild.name} - Üye İstatistikleri`)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields(
        { 
          name: '👥 Genel Toplam', 
          value: `> **Toplam Üye:** \`${totalMembers}\`\n> **Kullanıcı:** \`${humanCount}\`\n> **Bot:** \`${botCount}\``, 
          inline: false 
        },
        { 
          name: '🟢 Aktiflik Durumu', 
          value: `> Çevrimiçi: \`${online}\`\n> Boşta: \`${idle}\`\n> R. Etmeyin: \`${dnd}\`\n> Çevrimdışı: \`${offline}\``, 
          inline: true 
        },
        { 
          name: '✨ Özel İstatistik', 
          value: `> **Takviye (Nitro):** \`${nitroCount}\`\n> **Boost Seviyesi:** \`${message.guild.premiumTier}\``, 
          inline: true 
        }
      )
      .setFooter({ text: 'Veriler anlık olarak güncellendi.', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder()
      .setColor('Red')
      .setDescription('❌ Üye verileri çekilirken bir hata oluştu. Lütfen botun "Üye Erişimi (Member Intent)" izninin açık olduğundan emin olun.');
    
    await msg.edit({ embeds: [errorEmbed] });
  }
};

module.exports.conf = {
  aliases: ['say', 'üyeler', 'istatistik']
};

module.exports.help = {
  name: 'üyesayısı'
};
