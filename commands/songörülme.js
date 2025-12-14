const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const moment = require("moment");
moment.locale('tr');

// --- Basit bir bellek içi geçmiş kaydı (SunucuID -> KullanıcıID -> Son Görülme) ---
// NOT: Bot yeniden başlatıldığında silinir. Kalıcı olması için bir veritabanına taşımanız gerekir.
const serverLastSeenCache = new Map();

// --- EMOJİLER ---
const EMOJI = {
    TIK: '✅',
    X: '❌',
    SAAT: '⏱️',
    GIRIS: '🟢',
    CIKIS: '🔴',
    OYUN: '🎮',
    DURUM: '💬',
    PC: '🖥️',
    TELEFON: '📱'
};

// --------------------------------------------------------------------------------------
// KOMUT İŞLEYİCİ
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {

    // Kullanıcıyı bulma
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

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

    // Bekleyin mesajı
    const loadingMsg = await message.channel.send({
        embeds: [new EmbedBuilder().setColor('Yellow').setDescription('⏳ Veriler analiz ediliyor...')]
    });

    const user = target.user;
    const presence = target.presence;

    // Embed'in temelini oluştur
    const resultEmbed = new EmbedBuilder()
        .setColor('#5865F2') // Daha canlı bir renk
        .setTitle(`${EMOJI.SAAT} ${user.username} - Detaylı Aktiflik Analizi`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Sorgulayan: ${message.author.tag} • ${moment().format('LL LTS')}` });

    // 1. TEMEL BİLGİLER ALANI
    const basicInfoFields = [];
    basicInfoFields.push({ name: "👤 Kullanıcı", value: `${user.tag}`, inline: true });
    basicInfoFields.push({ name: "🆔 Kullanıcı ID", value: `\`${user.id}\``, inline: true });
    basicInfoFields.push({ name: "📅 Sunucuya Katılma", value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true });

    // 2. ANLIK DURUM (PRESENCE) ALANI
    const statusFields = [];
    let activityText = "*Aktif bir oyun/uygulama yok*";
    let platformText = "*Bilinmiyor*";

    if (presence) {
        // Durum
        const statusMap = { online: '🟢 Çevrimiçi', idle: '🌙 Boşta', dnd: '⛔ Rahatsız Etmeyin', offline: '⚫ Çevrimdışı' };
        const userStatus = statusMap[presence.status] || statusMap['offline'];
        statusFields.push({ name: "📊 Anlık Durum", value: userStatus, inline: true });

        // Aktif Oyun/Uygulama
        if (presence.activities && presence.activities.length > 0) {
            const mainActivity = presence.activities.find(a => a.type === 0) || presence.activities[0]; // TYPE 0: "Playing"
            activityText = `**${mainActivity.name}**` + (mainActivity.details ? `\n*${mainActivity.details}*` : '');
        }
        statusFields.push({ name: `${EMOJI.OYUN} Aktiflik`, value: activityText, inline: true });

        // Platform (İstemci)
        const clientTypes = [];
        if (presence.clientStatus) {
            if (presence.clientStatus.desktop) clientTypes.push(`${EMOJI.PC} Masaüstü`);
            if (presence.clientStatus.web) clientTypes.push(`${EMOJI.PC} Web`);
            if (presence.clientStatus.mobile) clientTypes.push(`${EMOJI.TELEFON} Mobil`);
        }
        platformText = clientTypes.length > 0 ? clientTypes.join(' | ') : platformText;
        statusFields.push({ name: "📱 Platform", value: platformText, inline: true });

        // Özel Durum (Custom Status)
        const customStatus = presence.activities.find(a => a.type === 4); // TYPE 4: "Custom Status"
        if (customStatus && customStatus.state) {
            statusFields.push({ name: `${EMOJI.DURUM} Özel Durum`, value: `"*${customStatus.state}*"`, inline: false });
        }

        // Discord'un Son Görülme Zamanı (Eğer çevrimdışıysa)
        if (presence.status === 'offline' && presence.lastSeenTimestamp) {
            const lastSeen = moment(presence.lastSeenTimestamp);
            statusFields.push({
                name: "👀 Discord'da Son Görülme",
                value: `**${lastSeen.fromNow()}**\n(${lastSeen.format('DD MMMM HH:mm')})`,
                inline: false
            });
        }
    } else {
        statusFields.push({ name: "📊 Anlık Durum", value: "⚫ Çevrimdışı (veya veri gizli)", inline: true });
        statusFields.push({ name: `${EMOJI.OYUN} Aktiflik`, value: activityText, inline: true });
        statusFields.push({ name: "📱 Platform", value: platformText, inline: true });
    }

    // 3. BU SUNUCUDAKİ GEÇMİŞ ALANI (Örnek Cache Kullanımı)
    const guildHistoryFields = [];
    const cacheKey = `${message.guild.id}-${user.id}`;

    // Bu etkileşim olduğunda cache'i güncelle (Kullanıcı bu komutla sorgulandı)
    serverLastSeenCache.set(cacheKey, {
        timestamp: Date.now(),
        channelName: message.channel.name
    });

    // Aynı kullanıcının önceki kaydını kontrol et
    const previousRecord = serverLastSeenCache.get(cacheKey);
    if (previousRecord) {
        const lastSeenTime = moment(previousRecord.timestamp);
        guildHistoryFields.push({
            name: "📝 Bu Sunucuda Sorgulanma",
            value: `**${lastSeenTime.fromNow()}**\n(#${previousRecord.channelName} kanalında)`,
            inline: false
        });
    }
    // NOT: Gerçek "son görülme" için guildMemberUpdate (rol/ses/kanal değişikliği) olaylarını dinlemelisiniz.

    // Embed Alanlarını Birleştir
    resultEmbed.addFields(
        { name: '─── 🔍 TEMEL BİLGİLER ───', value: '\u200b', inline: false },
        ...basicInfoFields,
        { name: '\u200b', value: '\u200b', inline: false }, // Boşluk
        { name: '─── 🚀 ANLIK DURUM & AKTİVİTE ───', value: '\u200b', inline: false },
        ...statusFields
    );

    if (guildHistoryFields.length > 0) {
        resultEmbed.addFields(
            { name: '\u200b', value: '\u200b', inline: false },
            { name: '─── 📜 BU SUNUCUDAKİ KAYIT ───', value: '\u200b', inline: false },
            ...guildHistoryFields
        );
    }

    // AÇIKLAMA: Nelerin mümkün olmadığını kullanıcıya bildir.
    resultEmbed.setDescription(`*Sunucu giriş/çıkış logları tutulmadığından, kesin "son giriş tarihi" Discord API ile alınamaz. Bu veri için botun \`guildMemberAdd\` olayını kaydetmesi gerekir.*`);

    // Mesajı Gönder
    await loadingMsg.edit({ embeds: [resultEmbed] });
};

module.exports.conf = {
    aliases: ["sondurum", "sonaktif", "detaylıdurum"],
    permLevel: 0
};

module.exports.help = {
    name: "sonaktiflik",
    description: "Kullanıcının anlık durumunu, aktivitesini, platformunu ve sunucudaki son görülme bilgisini detaylı gösterir.",
    usage: 'g!sonaktiflik [@Kullanıcı | KullanıcıID]'
};
