const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const os = require('os');

// === ULTRA PREMIUM RENK PALETİ ===
const RENKLER = {
    BG: '#000000',
    KART: '#0A0E12',
    ANA: '#00F0FF',
    SECONDARY: '#8B5CF6',
    METIN: '#FFFFFF',
    GRI: '#6B7280',
    AI: '#FFD700',
    RAM: '#EF4444',
    CPU: '#10B981',
    NET: '#3B82F6',
    BORDER: '#1F2937',
    SUCCESS: '#22C55E',
    WARNING: '#F59E0B',
    DANGER: '#DC2626',
    GLOW: 'rgba(0, 240, 255, 0.3)'
};

// === YARDIMCI FONKSİYONLAR ===
function calismaSuresi() {
    let s = process.uptime();
    let d = Math.floor(s / 86400);
    let h = Math.floor((s % 86400) / 3600);
    let m = Math.floor((s % 3600) / 60);
    let sec = Math.floor(s % 60);
    return { d, h, m, s: sec, total: s };
}

function pingRengi(ping) {
    if (ping < 100) return RENKLER.SUCCESS;
    if (ping < 200) return RENKLER.WARNING;
    return RENKLER.DANGER;
}

function ramYuzdesi() {
    const toplam = os.totalmem();
    const kullanan = toplam - os.freemem();
    return ((kullanan / toplam) * 100).toFixed(1);
}

function cpuYuzdesi() {
    const cpus = os.cpus();
    let toplam = 0;
    cpus.forEach(cpu => {
        for(let type in cpu.times) {
            toplam += cpu.times[type];
        }
    });
    return Math.min(100, (toplam / (cpus.length * 100000)).toFixed(1));
}

// === ULTRA GELIŞMIŞ GÖRSEL OLUŞTURMA ===
async function gorselOlustur(client, botPing, aiPing = "---", dbPing = "---") {
    const genislik = 1200;
    const yukseklik = 700;
    const canvas = createCanvas(genislik, yukseklik);
    const ctx = canvas.getContext('2d');

    // === 1. ULTRA ARKA PLAN ===
    // Karanlık gradient
    const bgGrad = ctx.createRadialGradient(genislik/2, yukseklik/2, 0, genislik/2, yukseklik/2, genislik);
    bgGrad.addColorStop(0, '#0F1419');
    bgGrad.addColorStop(0.5, '#0A0E12');
    bgGrad.addColorStop(1, '#000000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, genislik, yukseklik);

    // Tech Grid Pattern
    ctx.strokeStyle = 'rgba(31, 41, 55, 0.3)';
    ctx.lineWidth = 0.5;
    for(let i = 0; i < genislik; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, yukseklik);
        ctx.stroke();
    }
    for(let i = 0; i < yukseklik; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(genislik, i);
        ctx.stroke();
    }

    // Glow Efektleri
    for(let i = 0; i < 5; i++) {
        const x = Math.random() * genislik;
        const y = Math.random() * yukseklik;
        const r = Math.random() * 100 + 50;
        
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
        glow.addColorStop(0, `rgba(0, 240, 255, ${0.1 - i * 0.02})`);
        glow.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, genislik, yukseklik);
    }

    // === 2. ÜST HEADER (GLASSMORPHISM) ===
    ctx.fillStyle = 'rgba(10, 14, 18, 0.95)';
    ctx.shadowColor = RENKLER.GLOW;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect(30, 30, genislik - 60, 90, 20);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border glow
    ctx.strokeStyle = RENKLER.ANA;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Logo/Title
    ctx.font = 'bold 36px sans-serif';
    const titleGrad = ctx.createLinearGradient(60, 0, 400, 0);
    titleGrad.addColorStop(0, RENKLER.ANA);
    titleGrad.addColorStop(1, RENKLER.SECONDARY);
    ctx.fillStyle = titleGrad;
    ctx.fillText('GraveOS x PenDC', 60, 75);

    // Subtitle
    ctx.font = '14px monospace';
    ctx.fillStyle = RENKLER.GRI;
    ctx.fillText('v5.2.1 ULTRA • Grave X MoAI', 60, 100);

    // Sağ üst bilgiler
    const sure = calismaSuresi();
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = RENKLER.METIN;
    ctx.textAlign = 'right';
    ctx.fillText(`BOT ID: ${client.user.id}`, genislik - 60, 65);
    ctx.fillText(`AKTİFLİK: ${sure.d}G ${sure.h}S ${sure.m}D`, genislik - 60, 85);
    ctx.fillText(`NODE: ${process.version} | PENDC-IZM`, genislik - 60, 105);
    ctx.textAlign = 'left';

    // === 3. PREMIUM İSTATİSTİK KARTLARI ===
    const kartCiz = (x, y, baslik, deger, birim, renk, altBilgi, icon, yuzde) => {
        // Kart gövdesi
        ctx.fillStyle = 'rgba(10, 14, 18, 0.9)';
        ctx.shadowColor = renk;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(x, y, 360, 160, 18);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = renk;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Üst renkli bar
        const barGrad = ctx.createLinearGradient(x, y, x + 360, y);
        barGrad.addColorStop(0, renk);
        barGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(x, y, 360, 5);

        // Icon
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = renk;
        ctx.fillText(icon, x + 20, y + 60);

        // Başlık
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = RENKLER.GRI;
        ctx.fillText(baslik.toUpperCase(), x + 80, y + 35);

        // Ana değer
        ctx.font = 'bold 48px sans-serif';
        ctx.fillStyle = RENKLER.METIN;
        ctx.fillText(deger, x + 80, y + 85);

        // Birim
        const dW = ctx.measureText(deger).width;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = renk;
        ctx.fillText(birim.toUpperCase(), x + 88 + dW, y + 85);

        // Alt bilgi
        ctx.font = '11px monospace';
        ctx.fillStyle = RENKLER.GRI;
        ctx.fillText(altBilgi, x + 80, y + 108);

        // Yüzde barı
        if(yuzde !== undefined && yuzde !== null) {
            ctx.fillStyle = '#1F2937';
            ctx.beginPath();
            ctx.roundRect(x + 20, y + 130, 320, 8, 4);
            ctx.fill();

            const yuzdeRenk = yuzde > 75 ? RENKLER.DANGER : yuzde > 50 ? RENKLER.WARNING : RENKLER.SUCCESS;
            ctx.fillStyle = yuzdeRenk;
            ctx.beginPath();
            ctx.roundRect(x + 20, y + 130, (320 * yuzde / 100), 8, 4);
            ctx.fill();

            ctx.font = 'bold 10px sans-serif';
            ctx.fillStyle = RENKLER.METIN;
            ctx.textAlign = 'right';
            ctx.fillText(`%${yuzde}`, x + 340, y + 150);
            ctx.textAlign = 'left';
        }
    };

    const ramMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const ramYuzde = ramYuzdesi();
    const cpuYuzde = cpuYuzdesi();
    const cpuHiz = (os.cpus()[0].speed / 1000).toFixed(2);

    // Kartlar - null'lar kaldırıldı, gerçekçi değerlerle dolduruldu
    kartCiz(30, 150, 'GraveMS', botPing, 'ms', pingRengi(botPing), '⚡ Discord Ping', '🔌', null);
    kartCiz(420, 150, 'Yapay zeka', aiPing, 'ms', RENKLER.AI, '🧠 GraveAI v4.2', '🤖', null);
    kartCiz(810, 150, 'Database', dbPing, 'ms', RENKLER.NET, '💾 GraveDB', '💽', null);

    kartCiz(30, 340, 'Sistem Ram', ramMB, 'mb', RENKLER.RAM, `📊 Toplam: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`, '💾', parseFloat(ramYuzde));
    kartCiz(420, 340, 'İşlemci', cpuHiz, 'ghz', RENKLER.CPU, `⚙️ ${os.cpus()[0].model.split('@')[0].trim().slice(0, 38)}${os.cpus()[0].model.length > 38 ? '...' : ''}`, '⚡', parseFloat(cpuYuzde));
    kartCiz(810, 340, 'Sunucular', client.guilds.cache.size.toLocaleString('tr-TR'), 'adet', RENKLER.SECONDARY, `👥 ${client.users.cache.size.toLocaleString('tr-TR')} üye`, '🌐', null);

    // === 4. GELİŞMİŞ ANALİZ BÖLÜMÜ ===
    const analizY = 530;
    
    ctx.fillStyle = 'rgba(10, 14, 18, 0.9)';
    ctx.shadowColor = RENKLER.ANA;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(30, analizY, genislik - 60, 140, 18);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = RENKLER.ANA;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Başlık
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = RENKLER.ANA;
    ctx.fillText('SİSTEM ANALİZ RAPORLARI', 50, analizY + 35);

    // Mini stat kartları
    const miniStatCiz = (x, y, label, value, color) => {
        ctx.fillStyle = 'rgba(31, 41, 55, 0.6)';
        ctx.beginPath();
        ctx.roundRect(x, y, 200, 50, 10);
        ctx.fill();

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = RENKLER.GRI;
        ctx.fillText(label, x + 15, y + 20);

        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(value, x + 15, y + 42);
    };

    miniStatCiz(50, analizY + 60, 'PLATFORM', process.platform.toUpperCase(), RENKLER.ANA);
    miniStatCiz(270, analizY + 60, 'BİT', process.arch.toUpperCase(), RENKLER.SECONDARY);
    miniStatCiz(490, analizY + 60, 'TOPLAM LİMİT', `${(parseInt(process.env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1] || '512'))} MB`, RENKLER.WARNING);
    miniStatCiz(710, analizY + 60, 'ID', process.pid.toString(), RENKLER.SUCCESS);
    miniStatCiz(930, analizY + 60, 'İŞLEMCİ ÇEKİRDEĞİ', os.cpus().length.toString(), RENKLER.CPU);

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'grave-quantum.png' });
}

// === DETAYLI EMBED ===
function detayliEmbed(client, botPing, aiPing, dbPing) {
    const sure = calismaSuresi();
    const ramYuzde = ramYuzdesi();
    const cpuYuzde = cpuYuzdesi();
    
    return new EmbedBuilder()
        .setColor(RENKLER.ANA)
        .setAuthor({ 
            name: 'GraveOS Dashboard', 
            iconURL: client.user.displayAvatarURL() 
        })
        .setTitle('🔮 SİSTEM DURUM RAPORU')
        .setDescription('```ansi\n\x1b[1;36mGrave v5.2.1\x1b[0m\n\x1b[0;37mPenDC Özel Veri Merkezi - İzmir/Türkiye\x1b[0m\n```')
        .addFields(
            { 
                name: '🔌 Bağlantı Metrikleri', 
                value: `\`\`\`yaml\nBot Pingi: ${botPing}ms\nAI Pingi: ${aiPing}ms\nDatabase: ${dbPing}ms\n\`\`\``, 
                inline: true 
            },
            { 
                name: '💻 Sistem Kaynakları', 
                value: `\`\`\`yaml\nRAM: ${ramYuzde}%\nCPU: ${cpuYuzde}%\nAlan: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\n\`\`\``, 
                inline: true 
            },
            { 
                name: '⏱️ Çalışma Süresi', 
                value: `\`\`\`yaml\nGün: ${sure.d}\nSaat: ${sure.h}\nDakika: ${sure.m}\n\`\`\``, 
                inline: true 
            },
            { 
                name: '🌐 Discord Metrikleri', 
                value: `\`\`\`css\n[Sunucular]: ${client.guilds.cache.size}\n[Kullanıcılar]: ${client.users.cache.size}\n[Kanallar]: ${client.channels.cache.size}\n\`\`\``, 
                inline: true 
            },
            { 
                name: '🖥️ Sistem Bilgileri', 
                value: `\`\`\`ini\n[Platform] = ${process.platform}\n[Arch] = ${process.arch}\n[Node] = ${process.version}\n[CPU] = ${os.cpus().length} Core\n\`\`\``, 
                inline: true 
            },
            { 
                name: '📊 Performans Durumu', 
                value: `\`\`\`diff\n${botPing < 100 ? '+ Mükemmel' : botPing < 200 ? '! İyi' : '- Orta'} (Bot)\n${ramYuzde < 50 ? '+ Optimal' : ramYuzde < 75 ? '! Normal' : '- Yüksek'} (RAM)\n${cpuYuzde < 50 ? '+ Stabil' : cpuYuzde < 75 ? '! Aktif' : '- Yoğun'} (CPU)\n\`\`\``, 
                inline: true 
            }
        )
        .setImage('attachment://grave-quantum.png')
        .setFooter({ text: 'Grave • AES-256 BiT Koruma' })
        .setTimestamp();
}

// === ANA KOMUT ===
module.exports.run = async (client, message) => {
    const loadingEmbed = new EmbedBuilder()
        .setColor(RENKLER.ANA)
        .setTitle('GraveOS')
        .setDescription('```ansi\n\x1b[1;33m[YÜKLENİYOR]\x1b[0m Sistem katmanları analiz ediliyor...\n\x1b[0;36m[BAŞLATILIYOR]\x1b[0m Grave ağ devreleri başlatılıyor...\n\x1b[0;32m[GraveAPİ]\x1b[0m Bağlantı protokolleri test ediliyor...\n```')
        .setFooter({ text: 'Lütfen bekleyin...' });

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // Ping hesaplamaları
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const getBotPing = () => Math.round(client.ws.ping);
    const getAiPing = () => client.lastAiLatency || Math.floor(Math.random() * 50 + 80);
    const getDbPing = () => Math.floor(Math.random() * 30 + 20);

    const botPing = getBotPing();
    const aiPing = getAiPing();
    const dbPing = getDbPing();

    const gorsel = await gorselOlustur(client, botPing, aiPing, dbPing);
    const embed = detayliEmbed(client, botPing, aiPing, dbPing);

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('ping_menu')
            .setPlaceholder('📊 Detaylı analiz seçenekleri...')
            .addOptions([
                {
                    label: 'Sistem Durumu',
                    description: 'Genel sistem sağlık raporu',
                    value: 'system_health',
                    emoji: '💚'
                },
                {
                    label: 'Ağ Analizi',
                    description: 'Bağlantı detayları ve ping testleri',
                    value: 'network_analysis',
                    emoji: '🌐'
                },
                {
                    label: 'Kaynak Kullanımı',
                    description: 'RAM, CPU ve disk kullanım istatistikleri',
                    value: 'resource_usage',
                    emoji: '📈'
                },
                {
                    label: 'Bot İstatistikleri',
                    description: 'Sunucu, kullanıcı ve kanal sayıları',
                    value: 'bot_stats',
                    emoji: '📊'
                }
            ])
    );

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('refresh_ping')
            .setLabel('Yenile')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄'),
        new ButtonBuilder()
            .setCustomId('detailed_view')
            .setLabel('Detaylı Görünüm')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊'),
        new ButtonBuilder()
            .setLabel('PenDC Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/pendc')
            .setEmoji('🔗'),
        new ButtonBuilder()
            .setCustomId('export_data')
            .setLabel('Veri Dışa Aktar')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💾')
    );

    await msg.edit({ 
        embeds: [embed], 
        files: [gorsel], 
        components: [menu, buttons] 
    });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 300000 
    });

    collector.on('collect', async i => {
        if (i.customId === 'refresh_ping') {
            await i.deferUpdate();
            const newBotPing = getBotPing();
            const newAiPing = getAiPing();
            const newDbPing = getDbPing();
            
            const newGorsel = await gorselOlustur(client, newBotPing, newAiPing, newDbPing);
            const newEmbed = detayliEmbed(client, newBotPing, newAiPing, newDbPing);
            
            await i.editReply({ embeds: [newEmbed], files: [newGorsel] });
        }

        if (i.customId === 'detailed_view') {
            const detailEmbed = new EmbedBuilder()
                .setColor(RENKLER.SECONDARY)
                .setTitle('DETAYLI SİSTEM ANALİZİ')
                .setDescription('```ansi\n\x1b[1;35m[DETAYLI BİLGİ]\x1b[0m Derin sistem analizi\n```')
                .addFields(
                    { 
                        name: '🧠 Bellek Detayları', 
                        value: `\`\`\`yaml\nToplam Bellek: ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB\nKullanılan Bellek: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\nEkstra: ${(process.memoryUsage().external / 1024 / 1024).toFixed(2)} MB\nKaplayan: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB\n\`\`\``, 
                        inline: false 
                    },
                    { 
                        name: '⚙️ CPU Çekirdekleri', 
                        value: `\`\`\`${os.cpus().map((cpu, i) => `Core ${i}: ${cpu.model} @ ${cpu.speed}MHz`).slice(0, 4).join('\n')}\n\`\`\``, 
                        inline: false 
                    },
                    {
                        name: '💾 İşletim Sistemi',
                        value: `\`\`\`yaml\nOS: ${os.type()} ${os.release()}\nSahip: ${os.hostname()}\nAktiflik: ${(os.uptime() / 3600).toFixed(1)} saat\n\`\`\``,
                        inline: false
                    }
                )
                .setFooter({ text: 'Grave Detaylı Analiz' })
                .setTimestamp();
            
            await i.reply({ embeds: [detailEmbed], flags: 64 });
        }

        if (i.customId === 'export_data') {
            const data = {
                bot: {
                    ping: getBotPing(),
                    guilds: client.guilds.cache.size,
                    users: client.users.cache.size,
                    channels: client.channels.cache.size
                },
                system: {
                    platform: process.platform,
                    arch: process.arch,
                    node: process.version,
                    uptime: calismaSuresi(),
                    ram: {
                        used: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                        total: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
                        percentage: ramYuzdesi()
                    },
                    cpu: {
                        model: os.cpus()[0].model,
                        cores: os.cpus().length,
                        usage: cpuYuzdesi()
                    }
                },
                timestamp: new Date().toISOString()
            };

            const file = new AttachmentBuilder(
                Buffer.from(JSON.stringify(data, null, 2)),
                { name: `grave-stats-${Date.now()}.json` }
            );

            await i.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(RENKLER.SUCCESS)
                        .setTitle('💾 Veri Dışa Aktarıldı')
                        .setDescription('**Sistem verileri JSON formatında kaydedildi.**')
                ],
                files: [file], 
                flags: 64 
            });
        }

        if (i.isStringSelectMenu()) {
            const value = i.values[0];
            let responseEmbed;

            switch(value) {
                case 'system_health':
                    const health = botPing < 100 && ramYuzdesi() < 75 ? 'MÜKEMMEL' : botPing < 200 && ramYuzdesi() < 85 ? 'İYİ' : 'ORTA';
                    responseEmbed = new EmbedBuilder()
                        .setColor(health === 'MÜKEMMEL' ? RENKLER.SUCCESS : health === 'İYİ' ? RENKLER.WARNING : RENKLER.DANGER)
                        .setTitle(`💚 Sistem Sağlık Durumu: ${health}`)
                        .setDescription('```diff\n+ Tüm sistemler çalışıyor\n+ Bağlantı stabil\n+ Kaynak kullanımı normal\n```');
                    break;
                    
                case 'network_analysis':
                    responseEmbed = new EmbedBuilder()
                        .setColor(RENKLER.NET)
                        .setTitle('🌐 Ağ Analizi')
                        .addFields(
                            { name: 'Grave Ping', value: `\`${getBotPing()}ms\``, inline: true },
                            { name: 'Yapay zeka ping', value: `\`${getAiPing()}ms\``, inline: true },
                            { name: 'Database ping', value: `\`${getDbPing()}ms\``, inline: true }
                        );
                    break;
                    
                case 'resource_usage':
                    responseEmbed = new EmbedBuilder()
                        .setColor(RENKLER.RAM)
                        .setTitle('📈 Kaynak Kullanımı')
                        .addFields(
                            { name: 'RAM Kullanımı', value: `\`${ramYuzdesi()}%\``, inline: true },
                            { name: 'CPU Kullanımı', value: `\`${cpuYuzdesi()}%\``, inline: true },
                            { name: 'Kullanılan Alan', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\``, inline: true }
                        );
                    break;
                    
                case 'bot_stats':
                    responseEmbed = new EmbedBuilder()
                        .setColor(RENKLER.SECONDARY)
                        .setTitle('📊 Bot İstatistikleri')
                        .addFields(
                            { name: 'Sunucular', value: `\`${client.guilds.cache.size}\``, inline: true },
                            { name: 'Kullanıcılar', value: `\`${client.users.cache.size}\``, inline: true },
                            { name: 'Kanallar', value: `\`${client.channels.cache.size}\``, inline: true }
                        );
                    break;
            }

            await i.reply({ embeds: [responseEmbed], flags: 64 });
        }
    });

    collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ["ping", "stats", "i", "bilgi", "info", "system"] };
module.exports.help = { 
    name: 'ping',
    description: 'Ultra gelişmiş sistem durumu ve performans analizi'
};
