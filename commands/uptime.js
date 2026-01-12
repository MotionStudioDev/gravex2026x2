const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const moment = require('moment');
require('moment-duration-format');
const os = require('os');

// --- PenDC Cyber Palette ---
const RENKLER = {
    BG: '#08090A',
    PANEL: '#0D1117',
    TITLE: '#00F2FF',
    TEXT: '#F1F5F9',
    GRI: '#8B949E',
    OK: '#3DD687',
    WARN: '#FFB800',
    CRIT: '#FF4D4D',
    BORDER: '#1F2937'
};

async function gorselOlustur(client) {
    const w = 800;
    const h = 400; 
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');

    // 1. Arka Plan & Tech-Grid
    ctx.fillStyle = RENKLER.BG;
    ctx.fillRect(0, 0, w, h);
    
    ctx.strokeStyle = '#161B22';
    ctx.lineWidth = 1;
    for(let i=0; i<w; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,h); ctx.stroke(); }
    for(let i=0; i<h; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(w,h); ctx.stroke(); }

    // 2. Header (Fixlenmiş Hizalama)
    ctx.fillStyle = RENKLER.PANEL;
    ctx.beginPath(); ctx.roundRect(30, 20, w - 60, 60, 15); ctx.fill();
    ctx.strokeStyle = RENKLER.BORDER;
    ctx.stroke();

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = RENKLER.TITLE;
    ctx.fillText('GraveBOT Uptime', 55, 58);
    
    ctx.font = '12px monospace';
    ctx.fillStyle = RENKLER.GRI;
    ctx.textAlign = 'right';
    ctx.fillText('DURUM: ONLINE / PENDC IZMIR', w - 55, 56);
    ctx.textAlign = 'left';

    // 3. Ana Uptime Alanı
    ctx.fillStyle = RENKLER.PANEL;
    ctx.beginPath(); ctx.roundRect(30, 95, w - 60, 90, 18); ctx.fill();
    ctx.stroke();

    ctx.font = '500 13px sans-serif';
    ctx.fillStyle = RENKLER.GRI;
    ctx.fillText('TOPLAM KESİNTİSİZ ÇALIŞMA SÜRESİ', 55, 125);

    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = RENKLER.TEXT;
    const duration = moment.duration(client.uptime).format('D [GÜN] H [SAAT] m [DAK] s [SN]');
    ctx.fillText(duration, 55, 165);

    // 4. Bilgi Kartları (Shard kaldırıldı, İşlemci eklendi)
    const kartCiz = (x, y, baslik, deger, renk, yuzde) => {
        ctx.fillStyle = RENKLER.PANEL;
        ctx.beginPath(); ctx.roundRect(x, y, 240, 115, 20); ctx.fill();
        ctx.strokeStyle = RENKLER.BORDER;
        ctx.stroke();

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = RENKLER.GRI;
        ctx.fillText(baslik.toUpperCase(), x + 25, y + 35);

        ctx.font = 'bold 22px sans-serif'; // Yazı sığması için bir tık küçültüldü
        ctx.fillStyle = RENKLER.TEXT;
        ctx.fillText(deger, x + 25, y + 75);

        ctx.fillStyle = renk;
        ctx.beginPath(); ctx.roundRect(x + 25, y + 90, 190, 4, 2); ctx.fill();
        
        // Halka İndikatörü
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x + 205, y + 35, 12, 0, Math.PI * 2); ctx.stroke();
        
        ctx.strokeStyle = renk;
        ctx.beginPath(); ctx.arc(x + 205, y + 35, 12, -Math.PI/2, (Math.PI * 2 * yuzde) - Math.PI/2); ctx.stroke();
    };

    const start = moment(Date.now() - client.uptime).format('DD/MM HH:mm');
    const load = (os.loadavg()[0]).toFixed(2);
    const loadPercent = Math.min(load / 2, 1);
    const cpuInfo = `${os.arch().toUpperCase()} / ${os.cpus().length} CORE`;

    kartCiz(30, 200, 'Başlatılma', start, RENKLER.OK, 1);
    kartCiz(280, 200, 'Donanım Gücü', cpuInfo, RENKLER.TITLE, 0.9);
    kartCiz(530, 200, 'Sistem Yükü', `${load} AVG`, load > 1.5 ? RENKLER.CRIT : RENKLER.WARN, loadPercent);

    // 5. Footer
    ctx.font = '10px monospace';
    ctx.fillStyle = RENKLER.GRI;
    ctx.textAlign = 'center';
    ctx.fillText(`POWERED BY PENDC DATA CENTER | NODE: ${process.version} | OS: ${os.platform()}`, w/2, h - 20);

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'grave_uptime.png' });
}

module.exports.run = async (client, message) => {
    const yukleniyor = new EmbedBuilder()
        .setColor(RENKLER.TITLE)
        .setDescription('📡 **GraveOS:** Sistem katmanları analiz ediliyor...');

    const msg = await message.channel.send({ embeds: [yukleniyor] });

    const attachment = await gorselOlustur(client);
    
    const embed = new EmbedBuilder()
        .setColor('#0D1117')
        .setAuthor({ name: 'GraveOS Uptime Analiz Paneli', iconURL: client.user.displayAvatarURL() })
        .setDescription('>>> GraveBOT çekirdek sistemleri **PenDC** veri merkezinde **Ultra-Stabil** şekilde çalışmaktadır.')
        .setImage('attachment://grave_uptime.png')
        .setFooter({ text: 'GraveOS • Gerçek Zamanlı Sistem Verileri' })
        .setTimestamp();

    await msg.edit({ embeds: [embed], files: [attachment] });
};

module.exports.conf = {
    aliases: ['süre', 'aktiflik', 'ut']
};

module.exports.help = {
    name: 'uptime'
};
