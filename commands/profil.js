const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");

// --------------------------------------------------------------------------------------
// Fonksiyon: Rozetleri (User Flags) Emojilere Çevirir
// (RangeError [BitFieldInvalid]: Invalid bitfield flag or number: DISCORD_EMPLOYEE hatası çözüldü)
// --------------------------------------------------------------------------------------
function getUserBadges(userFlags) {
    if (!userFlags || userFlags.length === 0) return 'Yok';

    const flagMap = {
        Staff: '⭐', // Discord Ekip Üyesi (DISCORD_EMPLOYEE yerine Staff kullanılır)
        Partner: '💎', // Discord Partnerı
        Hypesquad: 'HypeSquad', // HypeSquad Temsilcisi
        BugHunterLevel1: '🐛', // Hata Avcısı Seviye 1
        BugHunterLevel2: '🐞', // Hata Avcısı Seviye 2
        PremiumEarlySupporter: '🎁', // Erken Destekçi (2018 Nitro)
        TeamPseudoUser: 'Takım Üyesi',
        System: 'Sistem',
        VerifiedBot: '✅', // Doğrulanmış Bot
        VerifiedDeveloper: '🛠️', // Erken Onaylanmış Bot Geliştiricisi
        DiscordCertifiedModerator: '🛡️', // Discord Onaylı Moderatör
        ActiveDeveloper: '💡', // Aktif Geliştirici
        // Hypesquad evleri
        HypeSquadOnlineHouse1: '🏠 **Bravery**',
        HypeSquadOnlineHouse2: '🏠 **Brilliance**',
        HypeSquadOnlineHouse3: '🏠 **Balance**'
    };

    return userFlags.map(flag => flagMap[flag] || flag).join(' ');
}

// --------------------------------------------------------------------------------------
// Fonksiyon: Cihaz Durumunu Kontrol Eder
// --------------------------------------------------------------------------------------
function getDeviceStatus(presence) {
    if (!presence || presence.status === 'offline') return '⚫ Çevrim dışı';
    
    const devices = [];
    const clientStatus = presence.clientStatus;

    if (clientStatus.desktop) devices.push('💻 Masaüstü');
    if (clientStatus.mobile) devices.push('📱 Mobil');
    if (clientStatus.web) devices.push('🌐 Web');

    return devices.length > 0 ? devices.join(' | ') : 'Bilinmiyor';
}


// --------------------------------------------------------------------------------------
// KOMUT İŞLEYİCİ
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {
    // Üye bilgisini alma
    const member =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[0]) ||
        message.member;

    if (!member) {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("🚫 Kullanıcı Bulunamadı")
                    .setDescription("Belirttiğin kullanıcı bu sunucuda bulunamadı.")
            ]
        });
    }

    // Gerekli verileri çekme
    const user = member.user;
    const avatar = user.displayAvatarURL({ dynamic: true, size: 1024 });
    const fetchedUser = await user.fetch(); // Banner ve Flags için API'dan çek
    const bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 1024 });
    
    // Rolleri sıralama ve listeleme
    const roles = member.roles.cache
        .filter(r => r.id !== message.guild.id)
        .sort((a, b) => b.position - a.position) 
        .map(r => r.toString())
        .join(", ") || "Yok";
    const rolesValue = roles.length > 1024 ? roles.substring(0, 1000) + '...' : roles;

    // --- YENİ EKLENEN VERİLER ---
    
    // Kullanıcı Rozetleri (Flags)
    const userFlags = getUserBadges(fetchedUser.flags.toArray());

    // Cihaz Durumu
    const deviceStatus = getDeviceStatus(member.presence);
    
    // Sunucudaki temel yetkiler
    const memberPermissions = member.permissions.toArray();
    const importantPermissions = [
        'Administrator', 'ManageGuild', 'KickMembers', 'BanMembers', 'ManageChannels', 'ManageRoles'
    ];
    // Kullanıcının sahip olduğu temel izinleri filtrele
    const majorPermissions = memberPermissions
        .filter(perm => importantPermissions.includes(perm))
        .map(perm => perm.replace(/([A-Z])/g, ' $1').trim()) // İzinleri daha okunur yap
        .join(', ') || 'Yok';

    // Bot ile Yetki Karşılaştırması
    const clientMember = message.guild.members.cache.get(client.user.id);
    let hierarchyStatus = '';
    if (member.id === message.guild.ownerId) {
        hierarchyStatus = 'Sunucu Sahibi 👑';
    } else if (member.roles.highest.position >= clientMember.roles.highest.position) {
        hierarchyStatus = 'Benden daha yüksek/eşit role sahip 🔒';
    } else {
        hierarchyStatus = 'Benden daha düşük role sahip ✅';
    }


    // --- TEMEL VERİLER ---
    const nickname = member.nickname || "Yok";
    const joined = `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`;
    const created = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
    const boosting = member.premiumSince
        ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>`
        : "Boost yok";
    
    const statusMap = {
        online: "🟢 Çevrim içi",
        idle: "🌙 Boşta",
        dnd: "⛔ Rahatsız Etmeyin",
        offline: "⚫ Çevrim dışı"
    };
    const presenceStatus = member.presence?.status || "offline";
    const durum = statusMap[presenceStatus];
    

    const embed = new EmbedBuilder()
        .setColor(member.displayHexColor === '#000000' ? 'Blurple' : member.displayHexColor) // Renk olarak kullanıcının en yüksek rol rengini kullan
        .setTitle(`👤 ${user.username} Profili`)
        .setThumbnail(avatar)
        .addFields(
            // Sütun 1: Kimlik & Genel Bilgi
            { name: "🆔 Kullanıcı ID", value: `\`${user.id}\``, inline: true },
            { name: "🎭 Kullanıcı Adı", value: user.tag, inline: true },
            { name: "🏷️ Sunucu Takma Adı", value: nickname, inline: true },
            
            // Sütun 2: Zaman & Durum
            { name: "📅 Hesap Oluşturulma", value: created, inline: true },
            { name: "📅 Sunucuya Katılım", value: joined, inline: true },
            { name: "🚀 Boost Başlangıcı", value: boosting, inline: true },

            // Sütun 3: Teknik Bilgiler
            { name: "💻 Durum (Genel)", value: durum, inline: true },
            { name: "📱 Cihaz Durumu", value: deviceStatus, inline: true },
            { name: "🏅 Rozetler (Flags)", value: userFlags, inline: true },
            
            // Satır 4: Yetki ve Roller
            { name: "👑 Hiyerarşi Durumu", value: hierarchyStatus, inline: false },
            { name: "🛡️ Temel Yetkiler", value: majorPermissions || 'Sadece standart yetkiler', inline: false },
            { name: "📌 Roller", value: rolesValue, inline: false },
        )
        .setFooter({ text: `Bilgileri gösteren: ${message.author.tag}` })
        .setTimestamp();

        
    // --- BUTON OLUŞTURMA ---
    const avatarButton = new ButtonBuilder()
        .setLabel('Avatarı Gör')
        .setStyle(ButtonStyle.Link)
        .setURL(avatar);

    const buttons = [avatarButton];

    // Eğer banner varsa, banner butonu ekle
    if (bannerURL) {
        const bannerButton = new ButtonBuilder()
            .setLabel('Bannerı Gör')
            .setStyle(ButtonStyle.Link)
            .setURL(bannerURL);
        buttons.push(bannerButton);
    }

    const row = new ActionRowBuilder().addComponents(buttons);
    
    // Embed ve Butonları gönder
    message.channel.send({ embeds: [embed], components: [row] });
};

module.exports.conf = {
    aliases: ["kullanıcı", "user", "info", "kb"],
    permLevel: 0
};

module.exports.help = {
    name: "profil",
    description: "Belirtilen kullanıcının profil bilgilerini detaylı şekilde gösterir.",
    usage: 'g!profil [@Kullanıcı]'
};
