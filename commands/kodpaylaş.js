const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const QRCode = require('qrcode');

const LANG_CONFIG = {
    javascript: {
        name: 'JavaScript',
        color: '#F7DF1E',
        gradient: ['#F7DF1E', '#F0DB4F'],
        icon: 'JS'
    },
    python: {
        name: 'Python',
        color: '#3776AB',
        gradient: ['#3776AB', '#4B8BBE'],
        icon: 'PY'
    },
    java: {
        name: 'Java',
        color: '#007396',
        gradient: ['#007396', '#5382A1'],
        icon: 'JAVA'
    },
    cpp: {
        name: 'C++',
        color: '#00599C',
        gradient: ['#00599C', '#659AD2'],
        icon: 'C++'
    },
    csharp: {
        name: 'C#',
        color: '#239120',
        gradient: ['#239120', '#9B4F96'],
        icon: 'C#'
    },
    php: {
        name: 'PHP',
        color: '#777BB4',
        gradient: ['#777BB4', '#8993BE'],
        icon: 'PHP'
    },
    ruby: {
        name: 'Ruby',
        color: '#CC342D',
        gradient: ['#CC342D', '#E74C3C'],
        icon: 'RUBY'
    },
    go: {
        name: 'Go',
        color: '#00ADD8',
        gradient: ['#00ADD8', '#29BEB0'],
        icon: 'GO'
    },
    rust: {
        name: 'Rust',
        color: '#DEA584',
        gradient: ['#DEA584', '#000000'],
        icon: 'RUST'
    },
    typescript: {
        name: 'TypeScript',
        color: '#3178C6',
        gradient: ['#3178C6', '#235A97'],
        icon: 'TS'
    },
    htmlcss: {
        name: 'HTML/CSS',
        color: '#E34C26',
        gradient: ['#E34C26', '#264DE4'],
        icon: 'WEB'
    },
    diğer: {
        name: 'Diğer',
        color: '#6E6E6E',
        gradient: ['#6E6E6E', '#9E9E9E'],
        icon: 'CODE'
    }
};

module.exports.run = async (client, message, args) => {
    try {
        if (!args[0] || !args[1]) {
            return sendHelp(message);
        }

        const [codeType, link] = args;
        
        const typeAliases = {
            'js': 'javascript', 'py': 'python', 'java': 'java',
            'cpp': 'cpp', 'c++': 'cpp', 'c#': 'csharp', 'cs': 'csharp',
            'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust',
            'ts': 'typescript', 'html': 'htmlcss', 'css': 'htmlcss',
            'diğer': 'diğer', 'diger': 'diğer'
        };
        
        const normalizedType = typeAliases[codeType.toLowerCase()] || codeType.toLowerCase();
        
        if (!LANG_CONFIG[normalizedType]) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ Geçersiz kod türü!')
                ]
            });
        }

        let validUrl = link.trim();
        if (!validUrl.startsWith('http')) validUrl = `https://${validUrl}`;

        try {
            new URL(validUrl);
        } catch {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245')
                    .setDescription('❌ Geçersiz URL!')
                ]
            });
        }

        const loadingMsg = await message.channel.send('🎨 Kart oluşturuluyor...');
        
        const qrBuffer = await QRCode.toBuffer(validUrl, {
            width: 180,
            margin: 1,
            color: {
                dark: '#00C853',
                light: '#FFFFFF'
            }
        });

        const canvas = await createAlignedCard(message.author, normalizedType, validUrl, qrBuffer);
        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'code-share.png' });

        const langConfig = LANG_CONFIG[normalizedType];

        const embed = new EmbedBuilder()
            .setColor(langConfig.color)
            .setTitle(`🚀 ${langConfig.name} Projesi`)
            .setDescription(`**${message.author.username}** yeni bir proje paylaştı!`)
            .setImage('attachment://code-share.png')
            .setTimestamp();

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🔗 Koda Git')
                .setStyle(ButtonStyle.Link)
                .setURL(validUrl)
                .setEmoji('🚀')
        );

        await loadingMsg.edit({ 
            content: null, 
            embeds: [embed], 
            components: [buttonRow], 
            files: [attachment] 
        });

    } catch (err) {
        console.error('Hata:', err);
        message.channel.send('❌ Bir hata oluştu!');
    }
};

function sendHelp(message) {
    const helpEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📝 Kod Paylaşım Sistemi')
        .setDescription('`g!kodpaylaş <dil> <link>`\n\n**Örnek:** `g!kodpaylaş js github.com/user/repo`');
    
    return message.channel.send({ embeds: [helpEmbed] });
}

async function createAlignedCard(author, langType, url, qrBuffer) {
    const WIDTH = 1400;
    const HEIGHT = 700;
    const config = LANG_CONFIG[langType];

    const canvas = Canvas.createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // === ARKAPLAN ===
    const bgGrad = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 0, WIDTH/2, HEIGHT/2, WIDTH);
    bgGrad.addColorStop(0, '#0d1117');
    bgGrad.addColorStop(0.5, '#090c10');
    bgGrad.addColorStop(1, '#050508');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Glow efekti
    const glowGrad = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 100, WIDTH/2, HEIGHT/2, 600);
    glowGrad.addColorStop(0, config.color + '10');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // === ANA KART ===
    const CARD_MARGIN = 100;
    const cardX = CARD_MARGIN;
    const cardY = CARD_MARGIN;
    const cardW = WIDTH - (CARD_MARGIN * 2);
    const cardH = HEIGHT - (CARD_MARGIN * 2);

    // Kart arkaplan
    ctx.save();
    ctx.shadowBlur = 60;
    ctx.shadowColor = config.color + '30';
    ctx.fillStyle = '#161b22';
    roundRect(ctx, cardX, cardY, cardW, cardH, 30);
    ctx.fill();
    ctx.restore();

    // Kart border
    ctx.save();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = config.color;
    roundRect(ctx, cardX, cardY, cardW, cardH, 30);
    ctx.stroke();
    ctx.restore();

    // === SABİT ÖLÇÜLER ===
    const SECTION_PADDING = 60;
    const LEFT_SECTION_W = 280; // Dil ikonu genişliği
    const RIGHT_SECTION_W = 220; // QR kod genişliği
    const CENTER_SECTION_W = cardW - LEFT_SECTION_W - RIGHT_SECTION_W - (SECTION_PADDING * 4);
    
    const CENTER_X = cardX + LEFT_SECTION_W + (SECTION_PADDING * 2) + (CENTER_SECTION_W / 2);
    const CARD_CENTER_Y = cardY + (cardH / 2);

    // === SOL: DİL İKONU (TAM ORTADA) ===
    const iconSize = 240;
    const iconX = cardX + SECTION_PADDING + ((LEFT_SECTION_W - iconSize) / 2);
    const iconY = CARD_CENTER_Y - (iconSize / 2);

    // Glow
    ctx.save();
    ctx.shadowBlur = 50;
    ctx.shadowColor = config.color;
    const iconGrad = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
    iconGrad.addColorStop(0, config.gradient[0]);
    iconGrad.addColorStop(1, config.gradient[1]);
    ctx.fillStyle = iconGrad;
    roundRect(ctx, iconX, iconY, iconSize, iconSize, 40);
    ctx.fill();
    ctx.restore();

    // İkon metni
    ctx.save();
    ctx.font = 'bold 90px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillText(config.icon, iconX + (iconSize / 2), iconY + (iconSize / 2));
    ctx.restore();

    // === SAĞ: QR KOD (TAM ORTADA) ===
    const qrSize = 180;
    const qrBoxW = 220;
    const qrBoxH = 260;
    const qrBoxX = cardX + cardW - SECTION_PADDING - RIGHT_SECTION_W + ((RIGHT_SECTION_W - qrBoxW) / 2);
    const qrBoxY = CARD_CENTER_Y - (qrBoxH / 2);

    // QR arkaplan
    ctx.save();
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 20);
    ctx.fill();

    // QR border
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = config.color;
    roundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 20);
    ctx.stroke();
    ctx.restore();

    // QR kod
    const qrX = qrBoxX + ((qrBoxW - qrSize) / 2);
    const qrY = qrBoxY + 20;
    const qrImage = await Canvas.loadImage(qrBuffer);
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // QR alt metin
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillText('TARAYIN', qrBoxX + (qrBoxW / 2), qrY + qrSize + 25);
    
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Hızlı Erişim', qrBoxX + (qrBoxW / 2), qrY + qrSize + 45);
    ctx.restore();

    // === ORTA: BİLGİLER (TAM ORTADA) ===
    const contentX = cardX + LEFT_SECTION_W + (SECTION_PADDING * 1.5);
    const contentW = CENTER_SECTION_W;
    
    // Başlık - ÜSTTE
    const titleY = cardY + 100;
    ctx.save();
    ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = config.color;
    ctx.fillText(config.name + ' Projesi', CENTER_X, titleY);
    ctx.restore();

    // Alt çizgi
    ctx.save();
    const lineY = titleY + 25;
    const lineGrad = ctx.createLinearGradient(CENTER_X - 200, 0, CENTER_X + 200, 0);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.5, config.color);
    lineGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = config.color;
    ctx.beginPath();
    ctx.moveTo(CENTER_X - 200, lineY);
    ctx.lineTo(CENTER_X + 200, lineY);
    ctx.stroke();
    ctx.restore();

    // Geliştirici - ORTADA
    const avatarSize = 80;
    const devY = CARD_CENTER_Y - 20;
    
    // Avatar
    const avatar = await Canvas.loadImage(author.displayAvatarURL({ extension: 'png', size: 128 }));
    const avatarX = CENTER_X - 150;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, devY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, devY, avatarSize, avatarSize);
    ctx.restore();

    // Avatar border
    ctx.save();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = config.color;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, devY + avatarSize/2, avatarSize/2 + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // İsim ve unvan
    ctx.save();
    const textX = avatarX + avatarSize + 20;
    
    ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(author.username, textX, devY + 30);

    ctx.font = '22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('Yazılım Geliştirici', textX, devY + 60);
    ctx.restore();

    // Bilgi kutusu - ALTTAN
    const infoBoxY = CARD_CENTER_Y + 80;
    const infoBoxH = 130;
    const infoBoxW = 450;
    const infoBoxX = CENTER_X - (infoBoxW / 2);

    // Kutunun arkaplanı
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, infoBoxX, infoBoxY, infoBoxW, infoBoxH, 15);
    ctx.fill();

    ctx.strokeStyle = config.color + '50';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = config.color + '30';
    roundRect(ctx, infoBoxX, infoBoxY, infoBoxW, infoBoxH, 15);
    ctx.stroke();
    ctx.restore();

    // Bilgi metinleri
    ctx.save();
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#c9d1d9';
    ctx.textAlign = 'left';
    
    const lineHeight = 32;
    const textStartY = infoBoxY + 35;
    
    ctx.fillText('Projeyi görüntülemek için butonu kullanın.', infoBoxX + 20, textStartY);
    
    ctx.fillStyle = '#8b949e';
    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillText('🔒 Güvenli bağlantı', infoBoxX + 20, textStartY + (lineHeight * 1) + 5);
    
    const date = new Date().toLocaleDateString('tr-TR');
    ctx.fillText(`📅 ${date}`, infoBoxX + 20, textStartY + (lineHeight * 2) + 5);
    ctx.restore();

    // === KÖŞE SÜSLEMELERİ ===
    drawCorners(ctx, cardX, cardY, cardW, cardH, config.color);

    return canvas;
}

function drawCorners(ctx, x, y, w, h, color) {
    const size = 35;
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;

    // Sol üst
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + size);
    ctx.stroke();

    // Sağ üst
    ctx.beginPath();
    ctx.moveTo(x + w - size, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + size);
    ctx.stroke();

    // Sol alt
    ctx.beginPath();
    ctx.moveTo(x, y + h - size);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + size, y + h);
    ctx.stroke();

    // Sağ alt
    ctx.beginPath();
    ctx.moveTo(x + w - size, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - size);
    ctx.stroke();

    // Noktalar
    ctx.fillStyle = color;
    const dotSize = 6;
    const positions = [
        [x + 15, y + 15],
        [x + w - 15, y + 15],
        [x + 15, y + h - 15],
        [x + w - 15, y + h - 15]
    ];
    
    positions.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

module.exports.conf = { 
    aliases: ['share', 'kod', 'code', 'proje'],
    cooldown: 15
};

module.exports.help = { 
    name: 'kodpaylaş',
    description: 'Profesyonel kod paylaşım kartı',
    usage: 'kodpaylaş <dil> <link>'
};
