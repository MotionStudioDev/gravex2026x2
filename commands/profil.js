const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, Presence } = require("discord.js");
const moment = require("moment");
moment.locale('tr');

// --- Haritalar ve Çeviriler ---
const PERMISSION_MAP = {
    Administrator: "Yönetici",
    ManageGuild: "Sunucu Yönet",
    KickMembers: "Üye At",
    BanMembers: "Üye Yasakla",
    ManageChannels: "Kanalları Yönet",
    ManageRoles: "Rolleri Yönet",
    ManageMessages: "Mesajları Yönet",
    ViewAuditLog: "Denetim Kaydını Gör",
    // Ek izinler
    MentionEveryone: "@everyone ve @here At",
    SendMessages: "Mesaj Gönder",
    AttachFiles: "Dosya Ekle",
    Stream: "Yayın Yap",
    ViewChannel: "Kanalları Gör"
};

const STATUS_MAP = {
    online: "🟢 Çevrim içi",
    idle: "🌙 Boşta",
    dnd: "⛔ Rahatsız Etmeyin",
    offline: "⚫ Çevrim dışı"
};

const ACTIVITY_TYPE_MAP = {
    0: "Oynuyor",
    1: "Yayın Yapıyor",
    2: "Dinliyor",
    3: "İzliyor",
    4: "Özel Durum",
    5: "Yarışıyor"
};

// --------------------------------------------------------------------------------------
// Fonksiyon: Rozetleri (User Flags) Emojilere Çevirir
// --------------------------------------------------------------------------------------
function getUserBadges(userFlags) {
    if (!userFlags || userFlags.length === 0) return 'Yok';

    const flagMap = {
        Staff: '⭐', // Discord Ekip Üyesi
        Partner: '💎', // Discord Partnerı
        Hypesquad: 'HypeSquad', // HypeSquad Temsilcisi
        BugHunterLevel1: '🐛', // Hata Avcısı Seviye 1
        BugHunterLevel2: '🐞', // Hata Avcısı Seviye 2
        PremiumEarlySupporter: '🎁', // Erken Destekçi
        TeamPseudoUser: 'Takım Üyesi',
        System: 'Sistem',
        VerifiedBot: '✅', // Doğrulanmış Bot
        VerifiedDeveloper: '🛠️', // Erken Onaylanmış Bot Geliştiricisi
        DiscordCertifiedModerator: '🛡️', // Discord Onaylı Moderatör
        ActiveDeveloper: '💡', // Aktif Geliştirici
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
    if (!presence || presence.status === 'offline') return '⚫ Yok';
    
    const devices = [];
    const clientStatus = presence.clientStatus;

    if (clientStatus.desktop) devices.push('💻 Masaüstü');
    if (clientStatus.mobile) devices.push('📱 Mobil');
    if (clientStatus.web) devices.push('🌐 Web');

    return devices.length > 0 ? devices.join(' | ') : 'Bilinmiyor';
}

// --------------------------------------------------------------------------------------
// Fonksiyon: Kullanıcının Aktivitesini Alır
// --------------------------------------------------------------------------------------
function getActivityInfo(presence) {
    if (!presence || !presence.activities || presence.activities.length === 0) return 'Yok';

    const mainActivity = presence.activities.find(a => a.type !== 4); // Özel Durum olmayan ana aktiviteyi bul
    if (!mainActivity) return 'Yok';

    let info = `**${ACTIVITY_TYPE_MAP[mainActivity.type]}**`;

    if (mainActivity.name) {
        info += `: ${mainActivity.name}`;
    }
    
    // Yayın detayını ekle
    if (mainActivity.type === 1 && mainActivity.url) {
        info += ` [*(Yayın izle)*](${mainActivity.url})`;
    }

    return info;
}


// --------------------------------------------------------------------------------------
// KOMUT İŞLEYİCİ
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {
    
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
    const fetchedUser = await user.fetch(); 
    const bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 1024 });
    const memberColor = member.displayHexColor === '#000000' ? '#5865F2' : member.displayHexColor; // Varsayılan rengi Blurple yap

    
    // Rolleri sıralama ve listeleme
    const roles = member.roles.cache
        .filter(r => r.id !== message.guild.id)
        .sort((a, b) => b.position - a.position) 
        .map(r => r.toString())
        .join(", ") || "Yok";
    const rolesValue = roles.length > 1024 ? roles.substring(0, 1000) + '...' : roles;

    // --- YENİ GELİŞMİŞ VERİLER ---
    
    // Kullanıcı Rozetleri (Flags)
    const userFlags = getUserBadges(fetchedUser.flags.toArray());

    // Durum ve Cihaz Bilgisi
    const presenceStatus = member.presence?.status || "offline";
    const durum = STATUS_MAP[presenceStatus];
    const deviceStatus = getDeviceStatus(member.presence);
    const activityInfo = getActivityInfo(member.presence);

    // Yetki Karşılaştırması ve İzinler
    const clientMember = message.guild.members.cache.get(client.user.id);
    let hierarchyStatus = '';
    if (member.id === message.guild.ownerId) {
        hierarchyStatus = 'Sunucu Sahibi 👑';
    } else if (member.roles.highest.position >= clientMember.roles.highest.position) {
        hierarchyStatus = 'Benden daha yüksek/eşit role sahip 🔒';
    } else {
        hierarchyStatus = 'Benden daha düşük role sahip ✅';
    }
    
    // Önemli Yetkiler (Türkçeleştirilmiş)
    const memberPermissions = member.permissions.toArray();
    const importantPermissionsKeys = [
        'Administrator', 'ManageGuild', 'BanMembers', 'KickMembers', 'ManageRoles', 'ManageChannels'
    ];

    const majorPermissions = memberPermissions
        .filter(perm => importantPermissionsKeys.includes(perm))
        .map(perm => PERMISSION_MAP[perm] || perm) 
        .join(', ') || 'Yok';

    // --- TEMEL ZAMAN & NICKNAME VERİLERİ ---
    const nickname = member.nickname || "Yok";
    const joined = `<t:${Math.floor(member.joinedTimestamp / 1000)}:f> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`;
    const created = `<t:${Math.floor(user.createdTimestamp / 1000)}:f> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`;
    const boosting = member.premiumSince
        ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>`
        : "Boost yok";
    
    // --- BOT KONTROLÜ ---
    const botDetail = user.bot ? 'Evet (Doğrulanmış Bot: ' + (user.flags.has(PermissionsBitField.Flags.VerifiedBot) ? '✅' : '❌') + ')' : 'Hayır';

    
    // --- EMBED OLUŞTURMA ---
    const embed = new EmbedBuilder()
        .setColor(memberColor) 
        .setTitle(`👤 ${user.username} Profili`)
        .setThumbnail(avatar)
        .addFields(
            // Sütun 1: Kimlik & Durum
            { name: "🆔 Kullanıcı ID", value: `\`${user.id}\``, inline: true },
            { name: "🏷️ Sunucu Takma Adı", value: nickname, inline: true },
            { name: "🤖 Bot Mu?", value: botDetail, inline: true },
            
            // Sütun 2: Bağlantı ve Zaman
            { name: "📅 Hesap Oluşturulma", value: created, inline: false },
            { name: "📅 Sunucuya Katılım", value: joined, inline: false },
            { name: "🚀 Boost Başlangıcı", value: boosting, inline: true },
            
            // Sütun 3: Durum ve Aktiflik
            { name: "💻 Genel Durum", value: durum, inline: true },
            { name: "📱 Aktif Cihazlar", value: deviceStatus, inline: true },
            { name: "🎮 Aktivite", value: activityInfo, inline: false },
            
            // Sütun 4: Yetki ve Rozetler
            { name: "🏅 Rozetler (Flags)", value: userFlags, inline: false },
            { name: "👑 Hiyerarşi Durumu", value: hierarchyStatus, inline: false },
            { name: "🛡️ Yönetici Yetkileri", value: majorPermissions || 'Sadece standart yetkiler', inline: false },
            
            // Satır 5: Roller
            { name: `📌 Roller (${member.roles.cache.size - 1})`, value: rolesValue, inline: false },
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
        embed.setImage(bannerURL); // Embed'in altına bannerı büyükçe yerleştir
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
    description: "Belirtilen kullanıcının profil bilgilerini en detaylı şekilde gösterir.",
    usage: 'g!profil [@Kullanıcı]'
};
