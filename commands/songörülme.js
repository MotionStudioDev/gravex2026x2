const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const LastSeen = require('../models/sonGorulme');
const moment = require('moment');
require('moment-duration-format');
moment.locale('tr');

// Milisaniye cinsinden süreyi Türkçe formatta dönüştürür
function formatDuration(ms) {
    if (ms <= 0) return 'Veri yok';
    const duration = moment.duration(ms);
    
    // Saat, dakika, saniye formatı
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    
    const parts = [];
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);
    if (seconds > 0) parts.push(`${seconds} saniye`);
    
    return parts.join(' ') || '0 saniye';
}

// Formatlı tarih gösterimi
function formatDate(date) {
    return moment(date).format('DD MMMM YYYY HH:mm');
}

// Rölative zaman gösterimi
function formatRelative(date) {
    return moment(date).fromNow();
}

// Butonun özel kimliği için prefix
const REFRESH_CUSTOM_ID = 'songorulme_guncelle';

// --------------------------------------------------------------------------------------
// ANA FONKSİYON: getAndSendLastSeen (Basit ve Direkt Gösterim)
// --------------------------------------------------------------------------------------
async function getAndSendLastSeen(client, interactionOrMessage, targetUser, targetMember, commandUser) {
    const isInteraction = interactionOrMessage.isButton?.() || false;
    const guild = interactionOrMessage.guild;
    
    // TargetMember'ı güncelle
    let refreshedTargetMember = targetMember;
    if (guild.members.cache.has(targetUser.id)) {
        try {
            refreshedTargetMember = await guild.members.fetch(targetUser.id);
        } catch (error) {
            refreshedTargetMember = targetMember;
        }
    }
    
    targetMember = refreshedTargetMember;
    
    if (!targetUser) {
        targetUser = targetMember.user;
    }
    
    // Veritabanı sorgusu
    const data = await LastSeen.findOne({ 
        guildID: guild.id, 
        userID: targetUser.id 
    });

    if (!data) {
        const noDataEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setDescription(`**${targetUser.tag}** için sunucuda henüz yeterli giriş/çıkış verisi bulunmuyor.`)
            .setFooter({ text: `Sorgulayan: ${commandUser.tag}` });
        
        return isInteraction 
            ? interactionOrMessage.reply({ embeds: [noDataEmbed], ephemeral: true })
            : interactionOrMessage.reply({ embeds: [noDataEmbed] });
    }

    // --- VERİ HESAPLAMALARI ---
    const lastJoin = data.lastJoin !== 0 ? data.lastJoin : null;
    const lastLeave = data.lastLeave !== 0 ? data.lastLeave : null;
    
    // Kullanıcının sunucuda olup olmadığını kontrol et
    const isUserCurrentlyInGuild = guild.members.cache.has(targetUser.id);
    
    // Çıkıştan girişe kadar geçen süre
    let timeBetweenLeaveAndJoin = 'Hesaplanamıyor';
    let timeBetweenRelative = '';
    
    if (lastLeave && lastJoin && lastJoin > lastLeave) {
        const durationMs = lastJoin - lastLeave;
        timeBetweenLeaveAndJoin = formatDuration(durationMs);
        timeBetweenRelative = `(${moment(lastLeave).fromNow()})`;
    }
    
    // Aktiflik süresi
    const activeDuration = formatDuration(data.totalActiveDuration);
    
    // --- EMBED OLUŞTURMA (Basit Gösterim) ---
    const embed = new EmbedBuilder()
        .setColor(targetMember?.displayHexColor || '#5865F2')
        .setTitle(`🎯 ${targetUser.username} Kişisinin Son Görülme Bilgileri`)
        .setDescription(`**Sunucu:** ${guild.name}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: '🟢 **Son Giriş:**',
                value: lastJoin 
                    ? `${formatDate(lastJoin)}\n${formatRelative(lastJoin)}`
                    : '❌ Veri Yok',
                inline: false
            },
            {
                name: '🔴 **Son Çıkış:**',
                value: lastLeave 
                    ? `${formatDate(lastLeave)}\n${formatRelative(lastLeave)}`
                    : '❌ Veri Yok / Hiç Ayrılmamış',
                inline: false
            }
        )
        .addFields(
            {
                name: '⏳ **Son Çıkıştan Son Girişe Kadar Geçen Süre:**',
                value: `\`${timeBetweenLeaveAndJoin}\` ${timeBetweenRelative}`,
                inline: false
            }
        )
        .addFields(
            {
                name: '📊 **Aktiflik Süresi (Toplam):**',
                value: `\`${activeDuration}\``,
                inline: true
            }
        )
        .setFooter({ 
            text: `Sorgulayan: ${commandUser.username} | Kullanıcı ID: ${targetUser.id} • ${moment().format('HH:mm')}`,
            iconURL: commandUser.displayAvatarURL()
        })
        .setTimestamp();

    // Buton oluştur (isteğe bağlı)
    const refreshButton = new ButtonBuilder()
        .setCustomId(`${REFRESH_CUSTOM_ID}_${targetUser.id}`)
        .setLabel('Yenile')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄');

    const row = new ActionRowBuilder().addComponents(refreshButton);
    
    // Yanıtı gönder
    const replyOptions = { embeds: [embed], components: [row] };
    
    if (isInteraction) {
        if (interactionOrMessage.deferred || interactionOrMessage.replied) {
            return interactionOrMessage.editReply(replyOptions);
        }
        return interactionOrMessage.reply(replyOptions);
    } else {
        const response = await interactionOrMessage.reply(replyOptions);
        
        // Kolektör başlat (60 saniye)
        const msg = response.fetch ? await response.fetch() : response;
        
        const collector = msg.createMessageComponentCollector({
            filter: i => i.customId.startsWith(REFRESH_CUSTOM_ID) && i.user.id === commandUser.id,
            time: 60000
        });

        collector.on('collect', async i => {
            await module.exports.handleInteraction(i, commandUser);
        });

        collector.on('end', async () => {
            const disabledButton = new ButtonBuilder()
                .setCustomId(`${REFRESH_CUSTOM_ID}_${targetUser.id}`)
                .setLabel('Süre Doldu')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const disabledRow = new ActionRowBuilder().addComponents(disabledButton);
            
            try {
                await msg.edit({ components: [disabledRow] });
            } catch (error) {
                // Mesaj silinmişse hata yakala
            }
        });
    }
}

// --------------------------------------------------------------------------------------
// KOMUT ÇALIŞTIRICI
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {
    // Hedef kullanıcıyı belirle
    const targetMember = message.mentions.members.first() || message.member;
    const targetUser = targetMember.user;
    const commandUser = message.author;

    // Ana fonksiyonu çağır
    await getAndSendLastSeen(client, message, targetUser, targetMember, commandUser);
};

// --------------------------------------------------------------------------------------
// BUTON ETKİLEŞİM İŞLEYİCİSİ
// --------------------------------------------------------------------------------------
module.exports.handleInteraction = async (interaction, commandUser) => {
    if (!interaction.isButton() || !interaction.customId.startsWith(REFRESH_CUSTOM_ID)) return;
    
    await interaction.deferUpdate().catch(() => {});
    
    const [_, __, targetUserId] = interaction.customId.split('_'); 
    
    const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
    
    if (!targetUser) {
        return interaction.editReply({ content: 'Kullanıcı bulunamadı!', ephemeral: true });
    }

    let targetMember = interaction.guild.members.cache.get(targetUserId);
    if (!targetMember) {
        try {
            targetMember = await interaction.guild.members.fetch(targetUserId);
        } catch (error) {
            targetMember = null;
        }
    }

    // Eğer commandUser parametresi yoksa, interaction kullanıcısını al
    const userToShow = commandUser || interaction.user;
    
    await getAndSendLastSeen(interaction.client, interaction, targetUser, targetMember, userToShow);
};

// --------------------------------------------------------------------------------------
// KOMUT KONFİGÜRASYONU
// --------------------------------------------------------------------------------------
module.exports.conf = {
    aliases: ['lastseen', 'aktivite', 'songörülüm'],
    permLevel: 0
};

module.exports.help = {
    name: 'songörülme',
    description: 'Bir kullanıcının sunucudaki son giriş, çıkış ve aktiflik süresini gösterir.',
    usage: 'g!songörülme [@Kullanıcı]'
};
