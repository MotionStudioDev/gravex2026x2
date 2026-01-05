const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas } = require('canvas');
const os = require('os');

// --- Tasarım Renkleri ---
const RENKLER = {
    BG: '#08090A',
    KART: '#111827',
    ANA: '#22D3EE',
    METIN: '#F1F5F9',
    GRI: '#94A3B8',
    AI: '#FBBF24',
    RAM: '#F43F5E',
    IZGARA: '#1E293B'
};

function calismaSuresi() {
    let s = process.uptime();
    let d = Math.floor(s / 86400);
    let h = Math.floor((s % 86400) / 3600);
    let m = Math.floor((s % 3600) / 60);
    return `${d}g ${h}s ${m}d`;
}

async function gorselOlustur(client, botPing, aiPing = "---") {
    const genislik = 800;
    const yukseklik = 400;
    const canvas = createCanvas(genislik, yukseklik);
    const ctx = canvas.getContext('2d');

    // 1. Arka Plan
    ctx.fillStyle = RENKLER.BG;
    ctx.fillRect(0, 0, genislik, yukseklik);
    
    // Izgara
    ctx.strokeStyle = RENKLER.IZGARA;
    ctx.lineWidth = 1;
    for(let i=0; i<genislik; i+=50) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,yukseklik); ctx.stroke(); }
    for(let i=0; i<yukseklik; i+=50) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(genislik,i); ctx.stroke(); }

    // 2. Üst Panel
    ctx.fillStyle = RENKLER.KART;
    ctx.beginPath(); ctx.roundRect(25, 25, genislik - 50, 55, 12); ctx.fill();

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = RENKLER.ANA;
    ctx.fillText('Grave X PenDC', 50, 60);
    
    ctx.font = '11px monospace';
    ctx.fillStyle = RENKLER.GRI;
    ctx.textAlign = 'right';
    ctx.fillText('Grave v2.5.1', genislik - 50, 58);
    ctx.textAlign = 'left';

    // 3. İstatistik Kartları (Alt çizgiler kaldırıldı)
    const kartCiz = (x, y, baslik, deger, birim, renk) => {
        ctx.fillStyle = RENKLER.KART;
        ctx.beginPath(); ctx.roundRect(x, y, 240, 100, 15); ctx.fill();
        
        // Yan Şerit
        ctx.fillStyle = renk;
        ctx.fillRect(x, y + 25, 3, 50);

        // Başlık
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = RENKLER.GRI;
        ctx.fillText(baslik.toUpperCase(), x + 20, y + 35);
        
        // Değer
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = RENKLER.METIN;
        ctx.fillText(deger, x + 20, y + 78);
        
        // MS / MB Yazısı (Alt çizgi kaldırıldı, sadeleştirildi)
        let dGenislik = ctx.measureText(deger).width;
        ctx.font = 'bold 16px sans-serif'; 
        ctx.fillStyle = renk;
        ctx.fillText(birim.toUpperCase(), x + 28 + dGenislik, y + 78);
    };

    const bellek = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    kartCiz(25, 110, 'Ağ Gecikmesi', botPing, 'ms', RENKLER.ANA);
    kartCiz(280, 110, 'Yapay Zeka', aiPing, 'ms', RENKLER.AI);
    kartCiz(535, 110, 'Bellek Yükü', bellek, 'mb', RENKLER.RAM);

    // 4. İlerleme Barları
    const barCiz = (y, yuzde, etiket, renk) => {
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = RENKLER.GRI;
        ctx.fillText(etiket, 45, y - 12);
        
        ctx.fillStyle = '#1F2937';
        ctx.beginPath(); ctx.roundRect(40, y, genislik - 80, 8, 4); ctx.fill();
        
        ctx.fillStyle = renk;
        ctx.beginPath(); ctx.roundRect(40, y, (genislik - 80) * Math.min(yuzde, 1), 8, 4); ctx.fill();
    };

    barCiz(270, (500 - botPing) / 500, 'BAĞLANTI DURUMU (PENDC)', RENKLER.ANA);
    barCiz(330, (1024 - bellek) / 1024, 'SİSTEM KAYNAK VERİMLİLİĞİ', RENKLER.RAM);

    // 5. Minimal Footer
    ctx.font = '10px monospace';
    ctx.fillStyle = RENKLER.GRI;
    ctx.textAlign = 'center';
    ctx.fillText(`Uptime: ${calismaSuresi()} | PenDC Data Center | Node: ${process.version}`, genislik/2, 385);

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'grave.png' });
}

module.exports.run = async (client, message) => {
    const yukleniyor = new EmbedBuilder()
        .setColor('#22D3EE')
        .setDescription('📡 **GraveOS:** Görsel birimler optimize ediliyor...');

    const msg = await message.channel.send({ embeds: [yukleniyor] });

    const p = () => Math.round(client.ws.ping);
    const a = () => client.lastAiLatency || "104";

    const gorsel = await gorselOlustur(client, p(), a());
    
    const anaEmbed = new EmbedBuilder()
        .setColor('#111827')
        .setAuthor({ name: 'Grave | PenDC İş Ortaklığı', iconURL: client.user.displayAvatarURL() })
        .setDescription('>>> GraveBOT verileri **PenDC** üzerinden başarıyla çekildi.')
        .setImage('attachment://grave.png')
        .setFooter({ text: 'GraveOS X PenDC İzmir' })
        .setTimestamp();

    const buton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ref').setLabel('Sistemi Tazele').setStyle(ButtonStyle.Secondary)
    );

    await msg.edit({ embeds: [anaEmbed], files: [gorsel], components: [buton] });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
    collector.on('collect', async i => {
        const yeniGorsel = await gorselOlustur(client, p(), a());
        await i.update({ files: [yeniGorsel] });
    });
};

module.exports.conf = { aliases: ["ping"] };
module.exports.help = { name: 'ping' };
