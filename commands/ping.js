const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas } = require('canvas');

// --- Gelişmiş Tasarım Motoru ---
const BAR_BG_COLOR = '#1e1f22'; 
const TEXT_LIGHT = '#FFFFFF'; 
const TEXT_GRAY = '#949BA4'; 
const BUTTON_DURATION = 60000;

function getPingStatus(ping) {
    if (ping <= 50) return { label: 'Mükemmel', color: '#00ffcc', glow: '#00ffcc' };
    if (ping <= 150) return { label: 'Stabil', color: '#5865F2', glow: '#5865F2' };
    if (ping <= 300) return { label: 'Normal', color: '#faa61a', glow: '#faa61a' };
    return { label: 'Riskli', color: '#f04747', glow: '#f04747' };
}

// Uptime Hesaplayıcı
function getUptime() {
    let totalSeconds = (process.uptime());
    let days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    return `${days}g ${hours}s ${minutes}d`;
}

async function createPingImage(apiPing) {
    const width = 600; 
    const height = 230; // Biraz daha genişletildi
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const status = getPingStatus(apiPing);
    
    // Katmanlı Arka Plan (Grave Dark Theme)
    ctx.fillStyle = '#2b2d31'; 
    ctx.fillRect(0, 0, width, height);
    
    // Panel Çerçevesi (Glass Effect)
    ctx.strokeStyle = '#3f4147';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, width - 30, height - 30);

    // Başlık
    ctx.textAlign = 'left';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = status.color; 
    ctx.fillText('GraveBOT Gecikme Süresi', 40, 55);

    // Sağ Üst Bilgi (Uptime)
    ctx.textAlign = 'right';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = TEXT_GRAY;
    ctx.fillText(`UPTIME: ${getUptime()}`, 550, 55);

    // Ana MS Değeri (Büyük ve Gölgeli)
    ctx.textAlign = 'left';
    ctx.font = 'bold 70px sans-serif';
    ctx.fillStyle = TEXT_LIGHT;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(`${apiPing}`, 40, 130);
    ctx.shadowBlur = 0;
    
    const pingWidth = ctx.measureText(`${apiPing}`).width;
    ctx.font = '24px sans-serif';
    ctx.fillStyle = status.color;
    ctx.fillText('ms', 40 + pingWidth + 10, 130);

    // Durum Yazısı (Neon)
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`[ ${status.label} ]`, 40 + pingWidth + 60, 125);

    // Gelişmiş Bar Tasarımı
    const BAR_X = 40;
    const BAR_Y = 160;
    const BAR_W = 520;
    const BAR_H = 16;

    // Arka Bar
    ctx.fillStyle = BAR_BG_COLOR;
    ctx.beginPath();
    ctx.roundRect(BAR_X, BAR_Y, BAR_W, BAR_H, 8);
    ctx.fill();

    // Dolu Bar (Cyber Gradient)
    const filledRatio = Math.max(0.1, Math.min(1, (600 - apiPing) / 600));
    const grad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W * filledRatio, 0);
    grad.addColorStop(0, status.color);
    grad.addColorStop(1, '#ffffff');

    ctx.shadowColor = status.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(BAR_X, BAR_Y, BAR_W * filledRatio, BAR_H, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Alt Bilgi Satırı
    const now = new Date().toLocaleTimeString('tr-TR');
    ctx.font = '12px sans-serif';
    ctx.fillStyle = TEXT_GRAY;
    ctx.textAlign = 'left';
    ctx.fillText(`Ping zamanı: ${now}`, 40, 205);
    ctx.textAlign = 'right';
    ctx.fillText('GraveBOT Gecikme Süresi', 560, 205);

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'grave_ping.png' });
}

module.exports.run = async (client, message, args) => {
    const loadingEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setDescription('<a:yukle:1440677432976867448> **Grave:** Sistem frekansları optimize ediliyor...');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    const getFullPing = () => Math.round(client.ws.ping);
    const attachment = await createPingImage(getFullPing());
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ping_refresh')
            .setLabel('Yeniden Analiz Et')
            .setEmoji('<a:pings:1440464530718068846>')
            .setStyle(ButtonStyle.Secondary)
    );

    const resultEmbed = new EmbedBuilder()
        .setColor(getPingStatus(getFullPing()).color) 
        .setImage('attachment://grave_ping.png')
        .setAuthor({ name: `Grave Gecikme Süresi`, iconURL: client.user.displayAvatarURL() })
        .setDescription(`>>> Bot Gecikmesi: \`${getFullPing()}ms\`\nSistem Durumu: \`${getPingStatus(getFullPing()).label}\``)
        .setFooter({ text: `Analiz Edildi • GraveBOT`, iconURL: message.author.displayAvatarURL() });

    await msg.edit({ embeds: [resultEmbed], files: [attachment], components: [row] });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.customId === 'ping_refresh' && i.user.id === message.author.id, 
        time: BUTTON_DURATION 
    });

    collector.on('collect', async (i) => {
        const refreshPing = getFullPing();
        const newAttachment = await createPingImage(refreshPing);
        
        const updateEmbed = EmbedBuilder.from(resultEmbed)
            .setColor(getPingStatus(refreshPing).color)
            .setDescription(`>>> Bot Gecikmesi: \`${refreshPing}ms\` (Güncel)\nSistem Durumu: \`${getPingStatus(refreshPing).label}\``);

        await i.update({ embeds: [updateEmbed], files: [newAttachment] });
    });

    collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('d').setLabel('Süre Doldu: g!ping').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        msg.edit({ components: [disabledRow] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ["ms", "p", "gecikme"] };
module.exports.help = { name: 'ping' };
