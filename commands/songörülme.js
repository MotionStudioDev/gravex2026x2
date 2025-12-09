const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const LastSeen = require('../models/sonGorulme');
const moment = require('moment');
require('moment-duration-format');
moment.locale('tr');

// Butonun özel kimliği için prefix
const REFRESH_CUSTOM_ID = 'songorulme_guncelle';

// Milisaniye cinsinden süreyi Türkçe formatta dönüştürür
function formatDuration(ms) {
    if (ms <= 0) return 'Veri yok';
    return moment.duration(ms).format("y [yıl], M [ay], d [gün], h [saat], m [dakika], s [saniye]");
}

// --------------------------------------------------------------------------------------
// ANA FONKSİYON: getAndSendLastSeen (Verileri çeker, Embed ve Butonu gönderir/günceller)
// --------------------------------------------------------------------------------------
async function getAndSendLastSeen(client, interactionOrMessage, targetUser, targetMember) {
    const isInteraction = interactionOrMessage.type === ComponentType.Button ? true : false;
    const guild = interactionOrMessage.guild;
    
    // Yanıt gönderme fonksiyonu. (İlk çalıştırma veya buton güncellemesi)
    const replyFunction = isInteraction ? interactionOrMessage.update.bind(interactionOrMessage) : interactionOrMessage.reply.bind(interactionOrMessage);

    if (!targetUser) {
        targetUser = targetMember.user;
    }
    
    // Veritabanı sorgusu
    const data = await LastSeen.findOne({ 
        guildID: guild.id, 
        userID: targetUser.id 
    });

    if (!data) {
        if (!isInteraction) {
            return interactionOrMessage.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FFA500')
                        .setDescription(`**${targetUser.tag}** için sunucuda henüz yeterli giriş/çıkış verisi bulunmuyor.`)
                ],
                ephemeral: true // Bu mesajı sadece komutu çalıştıran görebilir
            });
        }
        return;
    }

    // --- VERİ HESAPLAMALARI ---
    const lastJoin = data.lastJoin !== 0 ? data.lastJoin : null;
    const lastJoinText = lastJoin 
        ? `<t:${Math.floor(lastJoin / 1000)}:F> (<t:${Math.floor(lastJoin / 1000)}:R>)` 
        : '❌ Sunucuda şu an aktif.';
    
    const lastLeave = data.lastLeave !== 0 ? data.lastLeave : null;
    const lastLeaveText = lastLeave 
        ? `<t:${Math.floor(lastLeave / 1000)}:F> (<t:${Math.floor(lastLeave / 1000)}:R>)` 
        : '❌ Veri Yok / Hiç Ayrılmamış';

    const totalActiveDurationText = formatDuration(data.totalActiveDuration);

    let timeBetweenLeaveAndJoin = 'Hesaplanamıyor';
    if (lastLeave && lastJoin && lastJoin > lastLeave) {
        const durationMs = lastJoin - lastLeave;
        timeBetweenLeaveAndJoin = formatDuration(durationMs);
    }
    
    let currentSessionDuration = 'Aktif Değil';
    // Kullanıcının sunucuda olup olmadığını kontrol etme
    const isUserCurrentlyInGuild = guild.members.cache.has(targetUser.id); 

    if (isUserCurrentlyInGuild && lastJoin) {
        const durationMs = Date.now() - lastJoin;
        currentSessionDuration = formatDuration(durationMs);
    }

    // --- EMBED OLUŞTURMA ---
    const embed = new EmbedBuilder()
        .setColor(targetMember.displayHexColor !== '#000000' ? targetMember.displayHexColor : 'Purple')
        .setAuthor({ name: `${targetUser.tag} | Son Görülme Analizi (Güncel)`, iconURL: targetUser.displayAvatarURL() })
        .setDescription(`**${guild.name}** sunucusu için **${targetUser.tag}** kullanıcısının aktivite kayıtları.`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: "🟢 Son Sunucuya Giriş", value: lastJoinText, inline: false },
            { name: "🔴 Son Sunucudan Çıkış", value: lastLeaveText, inline: false },
            { name: "⏳ Aktiflik Süresi (Toplam)", value: `\`${totalActiveDurationText}\``, inline: false },
            { name: "⏱️ Son Oturum Süresi (Şu Anki)", value: `\`${currentSessionDuration}\``, inline: true },
            { name: "🔄 Çıkıştan Girişe Kadar Geçen Süre", value: `\`${timeBetweenLeaveAndJoin}\``, inline: true }
        )
        .setFooter({ text: `Kullanıcı ID: ${targetUser.id} | Son Güncelleme: ${moment().format('LTS')}` })
        .setTimestamp();

    // Butonu oluştur
    const refreshButton = new ButtonBuilder()
        .setCustomId(`${REFRESH_CUSTOM_ID}_${targetUser.id}_${interactionOrMessage.member.id}`)
        .setLabel('Verileri Güncelle (Canlı)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔄');

    const row = new ActionRowBuilder().addComponents(refreshButton);
    
    // Yanıt gönder/güncelle
    const response = await replyFunction({ embeds: [embed], components: [row] });
    
    // Eğer komut ilk kez çalıştırıldıysa (mesaj ile), kolektörü başlat
    if (!isInteraction) {
        // Discord.js'in API yanıtından mesaj nesnesini doğru şekilde alıyoruz
        const msg = response.fetch ? await response.fetch() : response;

        // --- 60 SANİYELİK KOLEKTÖR BAŞLANGICI ---
        const collector = msg.createMessageComponentCollector({
            filter: i => i.customId.startsWith(REFRESH_CUSTOM_ID),
            time: 60000, // 60 saniye
            max: 10, // Max 10 güncelleme izni
        });

        collector.on('collect', async i => {
            // Butona basıldığında handleInteraction fonksiyonunu çağır
            await module.exports.handleInteraction(i);
        });

        collector.on('end', async () => {
            // Butonu tekrar oluşturarak devre dışı bırakıyoruz
            const finalRefreshButton = new ButtonBuilder()
                .setCustomId(`${REFRESH_CUSTOM_ID}_${targetUser.id}_${interactionOrMessage.member.id}`)
                .setLabel('Süre Doldu')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const disabledRow = new ActionRowBuilder().addComponents(finalRefreshButton);

            // Mesajı güncelle, butonu devre dışı bırakılmış haliyle gönder
            // Hata almamak için try-catch kullanıyoruz
            await msg.edit({ components: [disabledRow] }).catch(() => {});
        });
        // --- KOLEKTÖR BİTİŞİ ---
    }
}
// --------------------------------------------------------------------------------------


module.exports.run = async (client, message, args) => {
    // Hedef kullanıcıyı belirle
    const targetMember = message.mentions.members.first() || message.member;
    const targetUser = targetMember.user;

    // Komut çalıştırıldığında ana fonksiyonu çağır
    await getAndSendLastSeen(client, message, targetUser, targetMember);
};


// --------------------------------------------------------------------------------------
// BUTON ETKİLEŞİM İŞLEYİCİSİ (KOLEKTÖR İÇİN GEREKLİ)
// --------------------------------------------------------------------------------------
module.exports.handleInteraction = async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith(REFRESH_CUSTOM_ID)) return;
    
    // Etkileşim zaten yanıtlanmışsa veya ertelenmişse tekrar denemeyin
    // Bu, "InteractionAlreadyReplied" hatasını engeller.
    if (interaction.deferred || interaction.replied) return; 

    // DeferUpdate (Güncellemeyi bekle)
    // Bu, "Unknown Interaction" hatasını engeller.
    await interaction.deferUpdate().catch(err => {
        // Eğer deferUpdate başarısız olursa (örneğin 3 saniye dolduysa), loglayıp dururuz.
        console.error('songörülme deferUpdate hatası:', err.code);
        return;
    }); 
    
    // Custom ID: songorulme_guncelle_TARGETID_COMMANDUSERID
    const [_, __, targetUserId] = interaction.customId.split('_'); 
    
    const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
    
    if (!targetUser) {
        // Hata durumunda editReply kullanılır.
        return interaction.editReply({ content: 'Sorgulanan kullanıcı bulunamadı!', ephemeral: true });
    }

    // Güncel sorgulanan üye verisini çek
    const targetMember = interaction.guild.members.cache.get(targetUserId);

    // Ana fonksiyonu butondan gelen interaction ile çağır (Bu, deferUpdate yapıldığı için update() kullanır)
    await getAndSendLastSeen(interaction.client, interaction, targetUser, targetMember);
};

// --------------------------------------------------------------------------------------
// KOMUT KONFİGÜRASYONU
// --------------------------------------------------------------------------------------
module.exports.conf = {
    aliases: ['lastseen', 'aktivite'],
    permLevel: 0
};

module.exports.help = {
    name: 'songörülme',
    description: 'Bir kullanıcının sunucudaki son giriş, çıkış ve toplam aktiflik süresini gösterir.',
    usage: 'g!songörülme [@Kullanıcı]'
};
