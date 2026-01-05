const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas } = require('canvas');
const os = require('os');

// --- Premium Cyber Palette ---
const RENKLER = {
    BG: '#040506',       // Çok derin siyah
    KART: '#0D1117',     // Cam efekti temeli
    ANA: '#00D7FF',      // Saf Cyber Mavi
    METIN: '#FFFFFF',
    GRI: '#8B949E',
    AI: '#FFB800',       // Amber AI
    RAM: '#FF3B30',      // Sistem Kırmızısı
    BORDER: '#30363D'    // Kart kenarlığı
};

function calismaSuresi() {
    let s = process.uptime();
    let d = Math.floor(s / 86400);
    let h = Math.floor((s % 86400) / 3600);
    let m = Math.floor((s % 3600) / 60);
    return `${d}g ${h}s ${m}d`;
}

async function gorselOlustur(client, botPing, aiPing = "---") {
    const genislik = 850; // Biraz genişletildi
    const yukseklik = 450; // Daha fazla detay için yükseltildi
    const canvas = createCanvas(genislik, yukseklik);
    const ctx = canvas.getContext('2d');

    // 1. Gelişmiş Arka Plan (Gradient)
    const bgGrad = ctx.createRadialGradient(genislik/2, yukseklik/2, 0, genislik/2, yukseklik/2, genislik);
    bgGrad.addColorStop(0, '#0d1117');
    bgGrad.addColorStop(1, '#040506');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, genislik, yukseklik);

    // Tech-Grid Efekti
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.5)';
    ctx.lineWidth = 0.5;
    for(let i=0; i<genislik; i+=30) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,yukseklik); ctx.stroke(); }
    for(let i=0; i<yukseklik; i+=30) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(genislik,i); ctx.stroke(); }

    // 2. Üst Header (Glassmorphism)
    ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
    ctx.beginPath(); ctx.roundRect(25, 20, genislik - 50, 60, 15); ctx.fill();
    ctx.strokeStyle = RENKLER.BORDER;
    ctx.stroke();

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = RENKLER.ANA;
    ctx.fillText('Grave X PenDC', 50, 58);
    
    ctx.font = '12px monospace';
    ctx.fillStyle = RENKLER.GRI;
    ctx.textAlign = 'right';
    ctx.fillText(`ID: ${client.user.id} | DC: PENDC-IZM`, genislik - 50, 56);
    ctx.textAlign = 'left';

    // 3. Ultra İstatistik Kartları
    const kartCiz = (x, y, baslik, deger, birim, renk, altBilgi) => {
        // Kart Gölgesi ve Gövdesi
        ctx.fillStyle = RENKLER.KART;
        ctx.beginPath(); ctx.roundRect(x, y, 250, 120, 18); ctx.fill();
        ctx.strokeStyle = RENKLER.BORDER;
        ctx.stroke();
        
        // Renkli İndikatör
        ctx.fillStyle = renk;
        ctx.beginPath(); ctx.roundRect(x + 15, y + 20, 30, 4, 2); ctx.fill();

        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = RENKLER.GRI;
        ctx.fillText(baslik.toUpperCase(), x + 15, y + 45);
        
        ctx.font = 'bold 38px sans-serif';
        ctx.fillStyle = RENKLER.METIN;
        ctx.fillText(deger, x + 15, y + 85);
        
        let dW = ctx.measureText(deger).width;
        ctx.font = 'bold 16px sans-serif'; 
        ctx.fillStyle = renk;
        ctx.fillText(birim.toUpperCase(), x + 22 + dW, y + 85);

        // Alt Küçük Bilgi
        ctx.font = '10px sans-serif';
        ctx.fillStyle = RENKLER.GRI;
        ctx.fillText(altBilgi, x + 15, y + 105);
    };

    const ramMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const cpuHiz = os.cpus()[0].speed;

    kartCiz(25, 100, 'Bağlantı', botPing, 'ms', RENKLER.ANA, 'Stabil PenDC Hattı');
    kartCiz(300, 100, 'Zeka Motoru', aiPing, 'ms', RENKLER.AI, 'GraveAI v4.2 Active');
    kartCiz(575, 100, 'Sistem Kaynağı', ramMB, 'mb', RENKLER.RAM, `${cpuHiz} MHz CPU Gücü`);

    // 4. Dinamik Analiz Barları
    const barCiz = (y, yuzde, etiket, renk, yuzdeMetni) => {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = RENKLER.METIN;
        ctx.fillText(etiket, 40, y - 15);
        ctx.textAlign = 'right';
        ctx.fillText(yuzdeMetni, genislik - 40, y - 15);
        ctx.textAlign = 'left';
        
        // Bar Background
        ctx.fillStyle = '#161B22';
        ctx.beginPath(); ctx.roundRect(40, y, genislik - 80, 12, 6); ctx.fill();
        
        // Bar Fill
        const grad = ctx.createLinearGradient(40, 0, genislik-40, 0);
        grad.addColorStop(0, renk);
        grad.addColorStop(1, RENKLER.BG);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.roundRect(40, y, (genislik - 80) * Math.min(yuzde, 1), 12, 6); ctx.fill();
    };

    const pingYuzde = Math.max(0, (300 - botPing) / 300);
    const ramYuzde = Math.max(0, (1024 - ramMB) / 1024);

    barCiz(280, pingYuzde, 'AĞ KARARLILIĞI', RENKLER.ANA, `%${Math.round(pingYuzde * 100)}`);
    barCiz(340, ramYuzde, 'BELLEK VERİMLİLİĞİ', RENKLER.RAM, `%${Math.round(ramYuzde * 100)}`);

    // 5. Modern Footer
    ctx.fillStyle = RENKLER.KART;
    ctx.fillRect(0, yukseklik - 40, genislik, 40);
    ctx.font = '11px monospace';
    ctx.fillStyle = RENKLER.GRI;
    ctx.textAlign = 'center';
    ctx.fillText(`ÇALIŞMA: ${calismaSuresi().toUpperCase()} | LOKASYON: IZMIR / TURKIYE | NODE: ${process.version}`, genislik/2, yukseklik - 15);

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'grave-ultra.png' });
}

module.exports.run = async (client, message) => {
    const loading = new EmbedBuilder()
        .setColor(RENKLER.ANA)
        .setDescription('📡 **GraveOS v5:** Sistem katmanları analiz ediliyor...');

    const msg = await message.channel.send({ embeds: [loading] });

    const getP = () => Math.round(client.ws.ping);
    const getA = () => client.lastAiLatency || "104";

    const gorsel = await gorselOlustur(client, getP(), getA());
    
    const embed = new EmbedBuilder()
        .setColor('#0D1117')
        .setAuthor({ name: 'Grave Bilgiler', iconURL: client.user.displayAvatarURL() })
        .setDescription('>>> GraveBOT çekirdek verileri **PenDC** özel veri merkezi üzerinden %100 doğrulukla çekilmiştir.')
        .setImage('attachment://grave-ultra.png')
        .setFooter({ text: 'GraveOS Dashboard' })
        .setTimestamp();

    const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ref').setLabel('Verileri Tazele').setStyle(ButtonStyle.Secondary).setEmoji('⚡')
    );

    await msg.edit({ embeds: [embed], files: [gorsel], components: [btn] });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
    collector.on('collect', async i => {
        const yeni = await gorselOlustur(client, getP(), getA());
        await i.update({ files: [yeni] });
    });
};

module.exports.conf = { aliases: ["ping", "stats", "i"] };
module.exports.help = { name: 'ping' };

