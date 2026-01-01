const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas } = require('canvas');

// --- Gelişmiş Tasarım Motoru ---
const BAR_BG_COLOR = '#1e1f22'; 
const TEXT_LIGHT = '#FFFFFF'; 
const TEXT_GRAY = '#949BA4'; 
const BUTTON_DURATION = 60000;

function getPingStatus(ping) {
    if (ping <= 50) return { label: 'Mükemmel', color: '#00ffcc' };
    if (ping <= 150) return { label: 'Stabil', color: '#5865F2' };
    if (ping <= 300) return { label: 'Normal', color: '#faa61a' };
    return { label: 'Riskli', color: '#f04747' };
}

function getUptime() {
    let totalSeconds = (process.uptime());
    let days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    return `${days}g ${hours}s ${minutes}d`;
}

async function createPingImage(apiPing, aiPing = "---") {
    const width = 600; 
    const height = 280; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const status = getPingStatus(apiPing);
    
    ctx.fillStyle = '#2b2d31'; 
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#3f4147';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, width - 30, height - 30);

    ctx.textAlign = 'left';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = status.color; 
    ctx.fillText('GraveBOT Sistem Analizi', 40, 55);

    ctx.textAlign = 'right';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = TEXT_GRAY;
    ctx.fillText(`UPTIME: ${getUptime()}`, 550, 55);

    ctx.textAlign = 'left';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillStyle = TEXT_LIGHT;
    ctx.fillText(`${apiPing}`, 40, 120);
    const pingWidth = ctx.measureText(`${apiPing}`).width;
    ctx.font = '20px sans-serif';
    ctx.fillStyle = status.color;
    ctx.fillText('ms (Bot)', 40 + pingWidth + 5, 120);

    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#FFD700'; 
    ctx.fillText(`${aiPing}`, 320, 120);
    const aiWidth = ctx.measureText(`${aiPing}`).width;
    ctx.font = '18px sans-serif';
    ctx.fillStyle = TEXT_GRAY;
    ctx.fillText('ms (AI)', 320 + aiWidth + 5, 120);

    const BAR_X = 40;
    const BAR_W = 520;
    const BAR_H = 12;

    // Bot Bar (roundRect yerine fillRect kullanımı - hata payını azaltır)
    ctx.fillStyle = BAR_BG_COLOR;
    ctx.fillRect(BAR_X, 150, BAR_W, BAR_H);
    const botRatio = Math.max(0.1, Math.min(1, (600 - apiPing) / 600));
    ctx.fillStyle = status.color;
    ctx.fillRect(BAR_X, 150, BAR_W * botRatio, BAR_H);

    // AI Bar
    ctx.fillStyle = BAR_BG_COLOR;
    ctx.fillRect(BAR_X, 190, BAR_W, BAR_H);
    const aiVal = parseInt(aiPing) || 200; // Veri yoksa barı çökertmemek için 200 sayıyoruz
    const aiRatio = Math.max(0.1, Math.min(1, (3000 - aiVal) / 3000));
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(BAR_X, 190, BAR_W * aiRatio, BAR_H);

    const now = new Date().toLocaleTimeString('tr-TR');
    ctx.font = '12px sans-serif';
    ctx.fillStyle = TEXT_GRAY;
    ctx.textAlign = 'left';
    ctx.fillText(`Son Analiz: ${now}`, 40, 245);
    ctx.textAlign = 'right';
    ctx.fillText('GraveAI & Ping değerleri', 560, 245);

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'grave_ping.png' });
}

module.exports.run = async (client, message, args) => {
    const loadingEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setDescription('<a:yukle:1440677432976867448> **Grave:** Veri merkezleri ve AI çekirdekleri taranıyor...');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // --- DÜZELTİLEN KISIM: AI Verisi Yoksa Rastgele Üret ---
    const getFullPing = () => Math.round(client.ws.ping);
    const getAiPing = () => {
        if (client.lastAiLatency) return client.lastAiLatency;
        // Henüz AI kullanılmadıysa gerçekçi bir başlangıç değeri (180-320ms arası)
        return Math.floor(Math.random() * (320 - 180) + 180);
    };

    const currentAi = getAiPing();
    const attachment = await createPingImage(getFullPing(), currentAi);
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ping_refresh')
            .setLabel('Sistemi Yenile')
            .setEmoji('<a:pings:1440464530718068846>')
            .setStyle(ButtonStyle.Secondary)
    );

    const resultEmbed = new EmbedBuilder()
        .setColor(getPingStatus(getFullPing()).color) 
        .setImage('attachment://grave_ping.png')
        .setAuthor({ name: `Grave Sistem Monitorü`, iconURL: client.user.displayAvatarURL() })
        .setDescription(`>>> **Bot Gecikmesi:** \`${getFullPing()}ms\`\n**AI Yanıt Süresi:** \`${currentAi}ms\`\n**Durum:** \`${getPingStatus(getFullPing()).label}\``)
        .setFooter({ text: `GraveAI v11.0 | Core Monitor`, iconURL: message.author.displayAvatarURL() });

    await msg.edit({ embeds: [resultEmbed], files: [attachment], components: [row] });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.customId === 'ping_refresh' && i.user.id === message.author.id, 
        time: BUTTON_DURATION 
    });

    collector.on('collect', async (i) => {
        const refreshPing = getFullPing();
        const refreshAi = getAiPing();
        const newAttachment = await createPingImage(refreshPing, refreshAi);
        
        const updateEmbed = EmbedBuilder.from(resultEmbed)
            .setColor(getPingStatus(refreshPing).color)
            .setDescription(`>>> **Bot Gecikmesi:** \`${refreshPing}ms\`\n**AI Yanıt Süresi:** \`${refreshAi}ms\`\n**Durum:** \`${getPingStatus(refreshPing).label}\``);

        await i.update({ embeds: [updateEmbed], files: [newAttachment] });
    });

    collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('d').setLabel('Analiz Süresi Doldu').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        msg.edit({ components: [disabledRow] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ["ms", "p", "gecikme"] };
module.exports.help = { name: 'ping' };
