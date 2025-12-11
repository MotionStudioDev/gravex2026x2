const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, time } = require("discord.js");
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// Font kaydı (opsiyonel - daha iyi görseller için)
try {
    registerFont(path.join(__dirname, '../fonts/arial.ttf'), { family: 'Arial' });
    registerFont(path.join(__dirname, '../fonts/arial-bold.ttf'), { family: 'Arial', weight: 'bold' });
} catch {}

// Seviye sistemi için (örnek - gerçek veritabanı bağlantısı olacak)
function calculateLevel(xp) {
    const level = Math.floor(0.1 * Math.sqrt(xp));
    const currentLevelXP = Math.pow(level / 0.1, 2);
    const nextLevelXP = Math.pow((level + 1) / 0.1, 2);
    const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return { level, progress: Math.min(progress, 100) };
}

// Profil kartı oluşturma (Canvas)
async function createProfileCard(user, member, badges, levelInfo, rank) {
    const width = 900;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Arkaplan gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Sol panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(30, 30, 300, 440);

    // Sağ panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(350, 30, 520, 440);

    // Avatar yuvarlağı
    ctx.save();
    ctx.beginPath();
    ctx.arc(180, 140, 80, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    
    try {
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.drawImage(avatar, 100, 60, 160, 160);
    } catch {
        ctx.fillStyle = '#5865F2';
        ctx.fillRect(100, 60, 160, 160);
    }
    ctx.restore();

    // Avatar çerçevesi
    ctx.strokeStyle = '#5865F2';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(180, 140, 82, 0, Math.PI * 2);
    ctx.stroke();

    // Banner (eğer varsa)
    const bannerURL = await user.fetch().then(u => u.bannerURL({ format: 'png', size: 512 }));
    if (bannerURL) {
        try {
            const banner = await loadImage(bannerURL);
            ctx.drawImage(banner, 350, 30, 520, 150);
            
            // Banner overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(350, 30, 520, 150);
        } catch {}
    }

    // Kullanıcı adı
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(user.username, 180, 250);

    // Tag
    ctx.fillStyle = '#B9BBBE';
    ctx.font = '24px Arial';
    ctx.fillText(`#${user.discriminator}`, 180, 285);

    // Seviye çubuğu
    const levelBarWidth = 250;
    const levelBarHeight = 20;
    const levelBarX = 55;
    const levelBarY = 320;
    
    // Seviye bar arkaplan
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(levelBarX, levelBarY, levelBarWidth, levelBarHeight);
    
    // Seviye bar doluluk
    const progressWidth = (levelInfo.progress / 100) * levelBarWidth;
    const levelGradient = ctx.createLinearGradient(levelBarX, levelBarY, levelBarX + levelBarWidth, levelBarY);
    levelGradient.addColorStop(0, '#5865F2');
    levelGradient.addColorStop(1, '#9B59B6');
    ctx.fillStyle = levelGradient;
    ctx.fillRect(levelBarX, levelBarY, progressWidth, levelBarHeight);
    
    // Seviye yazısı
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Seviye ${levelInfo.level}`, levelBarX + levelBarWidth/2, levelBarY - 10);

    // Rank
    ctx.fillStyle = '#FEE75C';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🏆 #${rank}`, 180, 380);

    // Badge'ler
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📊 İSTATİSTİKLER', 380, 200);

    // İstatistikler
    const stats = [
        { icon: '📅', label: 'Hesap Yaşı', value: calculateAccountAge(user.createdAt) },
        { icon: '⏱️', label: 'Son Görülme', value: 'Az Önce' },
        { icon: '🎮', label: 'Aktiflik', value: `${Math.floor(Math.random() * 100)}%` },
        { icon: '💬', label: 'Mesajlar', value: '1.2K' },
        { icon: '⭐', label: 'Yıldızlar', value: '45' },
        { icon: '🏆', label: 'Başarımlar', value: '12/50' }
    ];

    let statY = 240;
    stats.forEach((stat, i) => {
        const column = i % 2;
        const row = Math.floor(i / 2);
        const x = 380 + (column * 250);
        const y = statY + (row * 60);

        ctx.fillStyle = '#5865F2';
        ctx.font = '24px Arial';
        ctx.fillText(stat.icon, x, y);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(stat.label, x + 35, y);
        
        ctx.fillStyle = '#B9BBBE';
        ctx.font = '14px Arial';
        ctx.fillText(stat.value, x + 35, y + 20);
    });

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'profile_card.png' });
}

// Hesap yaşını hesapla
function calculateAccountAge(createdAt) {
    const diff = Date.now() - createdAt.getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    return years > 0 ? `${years}y ${months}m` : `${months}m`;
}

// Badge'leri al
function getBadges(user, member) {
    const badges = [];
    
    // Discord Badge'leri
    if (user.flags) {
        if (user.flags.has('DISCORD_EMPLOYEE')) badges.push({ emoji: '👨‍💼', name: 'Discord Çalışanı' });
        if (user.flags.has('PARTNERED_SERVER_OWNER')) badges.push({ emoji: '🤝', name: 'Partner' });
        if (user.flags.has('HYPESQUAD_EVENTS')) badges.push({ emoji: '🏠', name: 'HypeSquad' });
        if (user.flags.has('BUGHUNTER_LEVEL_1')) badges.push({ emoji: '🐛', name: 'Bug Hunter' });
        if (user.flags.has('EARLY_SUPPORTER')) badges.push({ emoji: '🌟', name: 'Early Supporter' });
        if (user.flags.has('VERIFIED_BOT')) badges.push({ emoji: '🤖', name: 'Verified Bot' });
    }
    
    // Sunucu Badge'leri
    if (member.premiumSince) badges.push({ emoji: '🚀', name: 'Booster' });
    if (member.permissions.has('Administrator')) badges.push({ emoji: '👑', name: 'Yönetici' });
    if (member.permissions.has('ManageMessages')) badges.push({ emoji: '🛡️', name: 'Moderatör' });
    
    return badges;
}

// Ana komut
module.exports.run = async (client, message, args) => {
    const startTime = Date.now();
    
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

    const user = member.user;
    
    // Kullanıcıyı fetch et (banner için)
    await user.fetch();
    
    // Verileri al
    const avatar = user.displayAvatarURL({ dynamic: true, size: 4096 });
    const bannerURL = user.bannerURL({ dynamic: true, size: 4096 });
    const nickname = member.nickname || "Yok";
    const joined = member.joinedAt ? time(member.joinedAt, 'R') : "Bilinmiyor";
    const created = time(user.createdAt, 'R');
    
    // Roller
    const roles = member.roles.cache
        .filter(r => r.id !== message.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => r.toString())
        .join(", ") || "Yok";

    // Durum
    const statusMap = {
        online: { emoji: "🟢", text: "Çevrim İçi" },
        idle: { emoji: "🌙", text: "Boşta" },
        dnd: { emoji: "⛔", text: "Rahatsız Etmeyin" },
        offline: { emoji: "⚫", text: "Çevrim Dışı" },
        invisible: { emoji: "⚫", text: "Çevrim Dışı" }
    };
    
    const status = member.presence?.status || "offline";
    const statusInfo = statusMap[status];
    
    // Boost
    const boosting = member.premiumSince 
        ? time(member.premiumSince, 'R')
        : "Boost yok";

    // Badge'ler
    const badges = getBadges(user, member);
    
    // Seviye ve rank (örnek veri)
    const xp = Math.floor(Math.random() * 10000); // DB'den gelecek
    const levelInfo = calculateLevel(xp);
    const rank = Math.floor(Math.random() * 100) + 1; // DB'den gelecek
    
    // Profil kartı oluştur
    const profileCard = await createProfileCard(user, member, badges, levelInfo, rank);
    
    // Ana embed
    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`👤 ${user.username} • Profil Analizi`)
        .setDescription(`**${user.tag}** kullanıcısının detaylı profil bilgileri`)
        .setImage('attachment://profile_card.png')
        .addFields(
            {
                name: `${statusInfo.emoji} **Durum & Aktivite**`,
                value: `**Durum:** ${statusInfo.text}\n` +
                       (member.presence?.activities[0] 
                           ? `**Aktivite:** ${member.presence.activities[0].name}\n`
                           : '') +
                       `**Son Görülme:** Az önce`,
                inline: true
            },
            {
                name: "📊 **İstatistikler**",
                value: `**Seviye:** ${levelInfo.level}\n` +
                       `**Rank:** #${rank}\n` +
                       `**XP:** ${xp.toLocaleString()}\n` +
                       `**Boost Süresi:** ${boosting}`,
                inline: true
            },
            {
                name: "🆔 **Kimlik Bilgileri**",
                value: `**ID:** \`${user.id}\`\n` +
                       `**Hesap Oluşturulma:** ${created}\n` +
                       `**Sunucuya Katılma:** ${joined}`,
                inline: false
            },
            {
                name: "🏷️ **İsimler**",
                value: `**Kullanıcı Adı:** ${user.tag}\n` +
                       `**Sunucu Takma Adı:** ${nickname}\n` +
                       `**Global Ad:** ${user.globalName || 'Yok'}`,
                inline: false
            },
            {
                name: `🎖️ **Rozetler (${badges.length})**`,
                value: badges.length > 0 
                    ? badges.map(b => `${b.emoji} ${b.name}`).join(' • ')
                    : "Rozet bulunmuyor",
                inline: false
            },
            {
                name: `👥 **Roller (${member.roles.cache.size - 1})**`,
                value: roles.length > 1024 
                    ? roles.substring(0, 1000) + '...'
                    : roles || "Rol bulunmuyor",
                inline: false
            }
        )
        .setFooter({ 
            text: `Profil ID: ${user.id} • İşlem süresi: ${Date.now() - startTime}ms`,
            iconURL: message.author.displayAvatarURL()
        })
        .setTimestamp();

    // Butonlar
    const buttons = [];
    
    // Avatar butonu
    buttons.push(
        new ButtonBuilder()
            .setCustomId('view_avatar')
            .setLabel('🖼️ Avatar')
            .setStyle(ButtonStyle.Primary)
    );
    
    // Banner butonu (eğer varsa)
    if (bannerURL) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('view_banner')
                .setLabel('🎨 Banner')
                .setStyle(ButtonStyle.Primary)
        );
    }
    
    // İstatistik butonu
    buttons.push(
        new ButtonBuilder()
            .setCustomId('view_stats')
            .setLabel('📈 İstatistikler')
            .setStyle(ButtonStyle.Secondary)
    );
    
    // Profil kartı butonu
    buttons.push(
        new ButtonBuilder()
            .setCustomId('download_card')
            .setLabel('💾 Kartı İndir')
            .setStyle(ButtonStyle.Success)
    );
    
    // Refresh butonu
    buttons.push(
        new ButtonBuilder()
            .setCustomId('refresh_profile')
            .setLabel('🔄 Yenile')
            .setStyle(ButtonStyle.Danger)
    );

    const rows = [
        new ActionRowBuilder().addComponents(buttons.slice(0, 3)),
        new ActionRowBuilder().addComponents(buttons.slice(3))
    ];

    // Mesajı gönder
    const msg = await message.channel.send({
        embeds: [embed],
        files: [profileCard],
        components: rows
    });

    // Kolektör
    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        await i.deferUpdate();
        
        switch(i.customId) {
            case 'view_avatar':
                const avatarEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`${user.username} - Avatar`)
                    .setImage(avatar)
                    .setFooter({ text: 'Tam boyut için tıklayın' });
                
                await i.followUp({ embeds: [avatarEmbed], ephemeral: true });
                break;
                
            case 'view_banner':
                if (bannerURL) {
                    const bannerEmbed = new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setTitle(`${user.username} - Banner`)
                        .setImage(bannerURL)
                        .setFooter({ text: 'Tam boyut için tıklayın' });
                    
                    await i.followUp({ embeds: [bannerEmbed], ephemeral: true });
                }
                break;
                
            case 'view_stats':
                const statsEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle(`📊 ${user.username} - Detaylı İstatistikler`)
                    .addFields(
                        { name: 'Seviye Sistemi', value: `**Seviye:** ${levelInfo.level}\n**XP:** ${xp}\n**İlerleme:** %${levelInfo.progress.toFixed(1)}`, inline: true },
                        { name: 'Aktivite', value: `**Son Aktiflik:** Bugün\n**Günlük Ortalama:** 2.5 saat\n**Aktif Gün:** 24/30`, inline: true },
                        { name: 'Katılım', value: `**Sunucu Sırası:** #${rank}\n**Boost Süresi:** ${boosting}\n**Katılım Sırası:** #${member.guild.members.cache.size}`, inline: true }
                    )
                    .setFooter({ text: 'Veriler günlük güncellenir' });
                
                await i.followUp({ embeds: [statsEmbed], ephemeral: true });
                break;
                
            case 'download_card':
                await i.followUp({
                    content: `📥 ${user.username}'in profil kartını indirmek için:`,
                    files: [profileCard],
                    ephemeral: true
                });
                break;
                
            case 'refresh_profile':
                await module.exports.run(client, message, args);
                msg.delete().catch(() => {});
                break;
        }
    });

    collector.on('end', async () => {
        const disabledRows = rows.map(row => {
            return new ActionRowBuilder().addComponents(
                row.components.map(button => 
                    ButtonBuilder.from(button).setDisabled(true)
                )
            );
        });
        
        await msg.edit({ components: disabledRows }).catch(() => {});
    });
};

module.exports.conf = {
    aliases: ["profile", "userinfo", "kullanıcıbilgi", "kb", "whois", "user"]
};

module.exports.help = {
    name: "profil",
    description: "Kullanıcının detaylı profil bilgilerini ve özel profil kartını gösterir.",
    usage: "g!profil [@kullanıcı/ID]",
    category: "Kullanıcı"
};
