const { EmbedBuilder } = require('discord.js');
const LastSeen = require('../models/sonGorulme'); 
const moment = require('moment');
require('moment-duration-format');
moment.locale('tr');

// Milisaniye cinsinden süreyi Türkçe formatta dönüştürür
function formatDuration(ms) {
    if (ms <= 0) return 'Veri yok';
    return moment.duration(ms).format("y [yıl], M [ay], d [gün], h [saat], m [dakika], s [saniye]");
}

module.exports.run = async (client, message, args) => {
    // Hedef kullanıcıyı belirle (Etiketlenen kişi veya komutu kullanan)
    const targetMember = message.mentions.members.first() || message.member;
    const targetUser = targetMember.user;

    const data = await LastSeen.findOne({ 
        guildID: message.guild.id, 
        userID: targetUser.id 
    });

    if (!data) {
        return message.reply({ 
            embeds: [
                new EmbedBuilder()
                    .setColor('#FFA500')
                    .setDescription(`**${targetUser.tag}** için sunucuda henüz yeterli giriş/çıkış verisi bulunmuyor.`)
            ] 
        });
    }

    // --- VERİ HESAPLAMALARI ---
    
    // Son Giriş (lastJoin)
    const lastJoin = data.lastJoin !== 0 ? data.lastJoin : null;
    const lastJoinText = lastJoin 
        ? `<t:${Math.floor(lastJoin / 1000)}:F> (<t:${Math.floor(lastJoin / 1000)}:R>)` 
        : '❌ Sunucuda şu an aktif.';
    
    // Son Çıkış (lastLeave)
    const lastLeave = data.lastLeave !== 0 ? data.lastLeave : null;
    const lastLeaveText = lastLeave 
        ? `<t:${Math.floor(lastLeave / 1000)}:F> (<t:${Math.floor(lastLeave / 1000)}:R>)` 
        : '❌ Veri Yok / Hiç Ayrılmamış';

    // Toplam Aktiflik Süresi
    const totalActiveDurationText = formatDuration(data.totalActiveDuration);

    // Son Çıkıştan Son Girişe Kadar Geçen Süre (lastLeave -> lastJoin)
    let timeBetweenLeaveAndJoin = 'Hesaplanamıyor';
    if (lastLeave && lastJoin && lastJoin > lastLeave) {
        // Çıkıştan sonra tekrar ne kadar süre sonra girdiğini hesapla
        const durationMs = lastJoin - lastLeave;
        timeBetweenLeaveAndJoin = formatDuration(durationMs);
    }
    
    // Şu anki oturum süresi (Kullanıcı hala sunucudaysa)
    let currentSessionDuration = 'Aktif Değil';
    if (targetMember && lastJoin) {
        const durationMs = Date.now() - lastJoin;
        currentSessionDuration = formatDuration(durationMs);
    }
    
    // --- EMBED OLUŞTURMA ---

    const embed = new EmbedBuilder()
        .setColor(targetMember.displayHexColor !== '#000000' ? targetMember.displayHexColor : 'Purple')
        .setAuthor({ name: `${targetUser.tag} | Son Görülme Analizi`, iconURL: targetUser.displayAvatarURL() })
        .setDescription(`**${message.guild.name}** sunucusu için **${targetUser.tag}** kullanıcısının aktivite kayıtları.`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
            // --- AKTİVİTE BİLGİLERİ ---
            { 
                name: "🟢 Son Sunucuya Giriş", 
                value: lastJoinText, 
                inline: false 
            },
            { 
                name: "🔴 Son Sunucudan Çıkış", 
                value: lastLeaveText, 
                inline: false 
            },
            
            // --- SÜRE ANALİZLERİ ---
            { 
                name: "⏳ Aktiflik Süresi (Toplam)", 
                value: `\`${totalActiveDurationText}\``, 
                inline: false 
            },
            { 
                name: "⏱️ Son Oturum Süresi (Şu Anki)", 
                value: `\`${currentSessionDuration}\``, 
                inline: true 
            },
            { 
                name: "🔄 Çıkıştan Girişe Kadar Geçen Süre", 
                value: `\`${timeBetweenLeaveAndJoin}\``, 
                inline: true 
            }
        )
        .setFooter({ text: `Kullanıcı ID: ${targetUser.id}` })
        .setTimestamp();

    message.channel.send({ embeds: [embed] });
};

module.exports.conf = {
    aliases: ['lastseen', 'aktivite'],
    permLevel: 0
};

module.exports.help = {
    name: 'songörülme',
    description: 'Bir kullanıcının sunucudaki son giriş, çıkış ve toplam aktiflik süresini gösterir.',
    usage: 'g!songörülme [@Kullanıcı]'
};
