const { EmbedBuilder, PermissionsBitField, Presence } = require("discord.js");
const moment = require("moment");
moment.locale('tr');

// --- EMOJİLER ---
const EMOJI = {
    TIK: '✅',
    X: '❌',
    SAAT: '⏱️',
    GIRIS: '🟢', // Çevrimiçi/Başarılı
    CIKIS: '🔴', // Rahatsız Etmeyin/Hata
    CIHAZ: '💻',
    AKTIVITE: '🎮'
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
// Fonksiyon: Cihaz Durumunu Kontrol Eder
// --------------------------------------------------------------------------------------
function getDeviceStatus(presence) {
    if (!presence || !presence.clientStatus) return 'Bilinmiyor';
    
    const devices = [];
    const clientStatus = presence.clientStatus;

    if (clientStatus.desktop) devices.push('💻 Masaüstü');
    if (clientStatus.mobile) devices.push('📱 Mobil');
    if (clientStatus.web) devices.push('🌐 Web');

    return devices.length > 0 ? devices.join(' | ') : 'Yok';
}

// --------------------------------------------------------------------------------------
// Fonksiyon: Kullanıcının Aktivitesini Alır
// --------------------------------------------------------------------------------------
function getActivityInfo(presence) {
    if (!presence || !presence.activities || presence.activities.length === 0) return 'Yok';

    // Özel Durum olmayan ve Main/Large olarak görülen ilk aktiviteyi bul
    const mainActivity = presence.activities.find(a => a.type !== 4); 
    if (!mainActivity) return 'Yok';

    let info = `**${ACTIVITY_TYPE_MAP[mainActivity.type]}**`;
    
    if (mainActivity.name) {
        info += `: ${mainActivity.name}`;
    }

    // Ek detaylar ekle
    if (mainActivity.details) {
        info += `\n> Detay: ${mainActivity.details}`;
    }
    
    // Yayın veya Spotify bağlantısı ekle
    if (mainActivity.type === 1 && mainActivity.url) { // Yayın
        info += ` [*(Yayın izle)*](${mainActivity.url})`;
    } else if (mainActivity.name === 'Spotify' && mainActivity.assets?.largeText) { // Spotify
        info += `\n> Şarkı: ${mainActivity.assets.largeText}`;
    }

    return info;
}


// --------------------------------------------------------------------------------------
// KOMUT İŞLEYİCİ
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {

    // Kullanıcıyı bulma
    const target =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[0]);

    if (!target) {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle(`${EMOJI.X} | Kullanıcı Bulunamadı`)
                    .setDescription("Lütfen geçerli bir kullanıcı etiketleyin veya ID girin.")
            ]
        });
    }

    const presence = target.presence;
    const user = target.user;
    
    // Geçerli aktiflik bilgisi kontrolü
    if (!presence) {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Grey")
                    .setTitle(`${EMOJI.SAAT} | Son Durum Bilgisi (Çevrimdışı)`)
                    .setDescription(`**${user.tag}** şu anda çevrimdışı görünüyor. En son durum güncellemesi bulunamadı.`)
                    .addFields(
                        { name: "Hesap Oluşturulma", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                        { name: "Sunucuya Katılma", value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true }
                    )
            ]
        });
    }

    // Yükleniyor mesajı
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Lütfen bekleyin, veriler analiz ediliyor...');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // --- GELİŞMİŞ VERİLERİ ÇEKME ---
    const lastSeenTimestamp = presence.lastStatusUpdateTimestamp || Date.now(); 
    const lastSeenTime = moment(lastSeenTimestamp).format('DD MMMM YYYY HH:mm:ss');
    const lastSeenRelative = moment(lastSeenTimestamp).fromNow();
    const statusText = STATUS_MAP[presence.status] || STATUS_MAP['offline'];
    const deviceStatus = getDeviceStatus(presence);
    const activityInfo = getActivityInfo(presence);


    // --- EMBED OLUŞTURMA ---
    const resultEmbed = new EmbedBuilder()
        .setColor(target.displayHexColor === '#000000' ? '#5865F2' : target.displayHexColor) // Renk Kullanıcının Rol Rengi
        .setTitle(`${EMOJI.SAAT} | ${user.username} Kişisinin Anlık Durum Analizi`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription(`**${user.tag}** kullanıcısının Discord üzerindeki en son aktiflik bilgileri aşağıdadır:`)
        .addFields(
            // 1. Bölüm: Durum ve Cihaz
            { name: "1️⃣ Genel Durum", value: statusText, inline: true },
            { name: `${EMOJI.CIHAZ} Aktif Cihazlar`, value: deviceStatus, inline: true },
            { name: '\u200b', value: '\u200b', inline: true }, // Boşluk

            // 2. Bölüm: Aktiflik
            { name: `${EMOJI.AKTIVITE} Güncel Aktivite`, value: activityInfo, inline: false },
            
            // 3. Bölüm: Zaman Bilgisi
            { 
                name: "⏱️ Son Durum Güncellemesi", 
                value: `Tarih: **${lastSeenTime}**\n(Yaklaşık **${lastSeenRelative}**)`, 
                inline: false 
            }
        )
        .setFooter({ text: `Sorgulayan: ${message.author.tag} | ID: ${user.id}` })
        .setTimestamp();

    await msg.edit({ embeds: [resultEmbed] });
};

module.exports.conf = {
    aliases: ["sondurum", "sonaktif", "onlinebilgi"],
    permLevel: 0
};

module.exports.help = {
    name: "songörülme",
    description: "Kullanıcının Discord'daki anlık durumunu, aktif olduğu cihazları ve son durum güncelleme süresini gösterir.",
    usage: 'g!sonaktiflik [@Kullanıcı]'
};
