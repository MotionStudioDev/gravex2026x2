const { EmbedBuilder, ChannelType } = require('discord.js');
const moment = require('moment');

module.exports.run = async (client, message, args) => {
    // ⏱️ Analiz başlangıç zamanını tutuyoruz
    const start = Date.now();

    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('🔍 **Sunucu verileri derinlemesine analiz ediliyor, lütfen bekleyin...**');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // 📊 Veri Toplama Aşaması
    const sunucu = message.guild;
    const kanallar = sunucu.channels.cache;
    const üyeler = sunucu.memberCount;
    const botlar = sunucu.members.cache.filter(m => m.user.bot).size;
    const insanlar = üyeler - botlar;
    const roller = sunucu.roles.cache.size;
    const emojiler = sunucu.emojis.cache.size;
    const online = sunucu.members.cache.filter(m => m.presence?.status !== 'offline').size;
    
    // Güvenlik Seviyesi Sözlüğü
    const verifLevels = {
        0: 'Yok (Serbest)',
        1: 'Düşük (E-posta Onaylı)',
        2: 'Orta (5 Dakika Üyelik)',
        3: 'Yüksek (10 Dakika Üyelik)',
        4: 'Çok Yüksek (Telefon Onaylı)'
    };

    // ⏱️ Analiz bitiş zamanını hesaplıyoruz
    const duration = Date.now() - start;

    const resultEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`🏰 ${sunucu.name} | Sunucu Analiz Raporu`)
        .setThumbnail(sunucu.iconURL({ dynamic: true, size: 1024 }))
        .setImage(sunucu.bannerURL({ size: 1024 })) // Sunucu bannerı yoksa boş görünür
        .addFields(
            { name: '👑 Sunucu Sahibi', value: `<@${sunucu.ownerId}>`, inline: true },
            { name: '🆔 Sunucu ID', value: `\`${sunucu.id}\``, inline: true },
            { name: '📅 Kurulma Tarihi', value: `${moment(sunucu.createdAt).format('DD MMMM YYYY')}`, inline: true },
            
            { name: '👥 Üye Yapısı', value: `**Toplam:** ${üyeler}\n👤 **İnsan:** ${insanlar}\n🤖 **Bot:** ${botlar}\n🟢 **Aktif:** ${online}`, inline: true },
            { name: '💬 Kanal Dağılımı', value: `**Yazı:** ${kanallar.filter(c => c.type === ChannelType.GuildText).size}\n🔊 **Ses:** ${kanallar.filter(c => c.type === ChannelType.GuildVoice).size}\n📁 **Kategori:** ${kanallar.filter(c => c.type === ChannelType.GuildCategory).size}`, inline: true },
            { name: '🛡️ Güvenlik ve Dil', value: `**Seviye:** ${verifLevels[sunucu.verificationLevel]}\n**Dil:** ${sunucu.preferredLocale}`, inline: true },
            
            { name: '🚀 Takviye Durumu', value: `**Seviye:** ${sunucu.premiumTier}\n**Takviye:** ${sunucu.premiumSubscriptionCount || 0}`, inline: true },
            { name: '🎭 Diğer Veriler', value: `**Rol Sayısı:** ${roller}\n**Emoji Sayısı:** ${emojiler}\n**Sticker:** ${sunucu.stickers.cache.size}`, inline: true }
        )
        .setFooter({ 
            text: `Sorgulayan: ${message.author.tag} • Analiz tam ${duration}ms sürdü.`, 
            iconURL: message.author.displayAvatarURL() 
        })
        .setTimestamp();

    // 🚀 Düzenleme (Edit) işlemi
    await msg.edit({ embeds: [resultEmbed] });
};

module.exports.conf = {
    aliases: ['sunucu', 'server', 'si']
};

module.exports.help = {
    name: 'sunucu-bilgi'
};
