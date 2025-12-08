const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas');

// --- YARDIMCI FONKSİYONLAR ---

/**
 * Resmi yuvarlak kırparak ve GLOW efekti ekleyerek çizer.
 */
function drawCircularImage(ctx, image, x, y, size, color) {
    ctx.save();
    
    // 1. GLOW Efekti (Gölge)
    ctx.shadowBlur = 15;
    ctx.shadowColor = color; 

    // 2. Daire Maskesi
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    
    // 3. Resmi Çizme
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();

    // 4. Çerçeve (Glow'un üzerine daha keskin bir çerçeve)
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 + 2, 0, Math.PI * 2, true);
    ctx.stroke();
}

/**
 * Profesyonel uyum çubuğu çizer.
 */
function drawProgressBar(ctx, uyum, Y_POS) {
    const BAR_WIDTH = 600;
    const BAR_HEIGHT = 25; // Yüksekliği artırıldı
    const X = 50;
    const RADIUS = 12; 

    // 1. Arka Planı Çiz (Koyu Gri)
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.roundRect(X, Y_POS, BAR_WIDTH, BAR_HEIGHT, RADIUS);
    ctx.fill();

    // 2. Dolu Kısmı Çiz (Görseldeki gibi Gold/Red Gradient)
    const fillWidth = (uyum / 100) * BAR_WIDTH;
    
    const gradient = ctx.createLinearGradient(X, Y_POS, X + BAR_WIDTH, Y_POS);
    // Görseldeki gibi soldan sağa geçiş
    gradient.addColorStop(0, '#FFC72C'); // Altın sarısı
    gradient.addColorStop(0.5, '#FF7F50'); // Mercan
    gradient.addColorStop(1, '#DC143C'); // Kırmızı
    
    ctx.fillStyle = gradient;
    if (fillWidth > 0) {
        ctx.beginPath();
        ctx.roundRect(X, Y_POS, fillWidth, BAR_HEIGHT, RADIUS);
        ctx.fill();
    }

    // 3. Yüzde Metni (Bar Üzerinde)
    ctx.font = '16px sans-serif'; // Varsayılan font
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(`%${uyum}`, X + fillWidth / 2, Y_POS + BAR_HEIGHT / 2 + 5); 
}

module.exports.run = async (client, message, args) => {
    // --- 1. HEDEFLERİ BELİRLEME VE HATA KONTROLÜ (Aynı kaldı) ---
    let target1 = message.author;
    let target2Member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    let target2 = target2Member ? target2Member.user : null;

    if (!target2Member && args[0]) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanım Hatası').setDescription('Belirtilen ID veya etiket ile bir kullanıcı bulamadım.')] });
    }
    // ... (Diğer hatalar aynı) ...
    if (message.mentions.members.size === 1) {
        if (target2.id === message.author.id) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanım Hatası').setDescription('Lütfen kendinizden farklı bir kişiyi etiketleyin.')] });
        }
    } else if (message.mentions.members.size === 2) {
        target1 = message.mentions.members.first().user;
        target2 = message.mentions.members.last().user;
        if (target1.id === target2.id) {
             return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanım Hatası').setDescription('İki farklı kişiyi etiketlemelisiniz.')] });
        }
    } else if (!target2) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanım Hatası').setDescription('Lütfen iki farklı kişiyi etiketleyin veya bir kişiyi etiketleyerek kendinizle ship yapın.')] });
    }
    
    if (target1.bot || target2.bot) {
        return message.reply("🤖 Botlar aşkı kaldıramaz! Lütfen sadece kullanıcıları ship'leyin.");
    }
    
    // --- UYUM HESAPLAMA ---
    const sortedIds = [target1.id, target2.id].sort().join('');
    let seed = 0;
    for (let i = 0; i < sortedIds.length; i++) {
        seed += sortedIds.charCodeAt(i);
    }
    const uyum = (seed * 97) % 101; 
    
    // --- ROMANTİK CÜMLELER ve EMBED ÜRETİCİSİ (Aynı kaldı) ---
    const romantikCumleler = [
        (a, b) => `İki yıldızın çarpışması: ${a.username} ve ${b.username}'in kaderi yeniden yazıldı! 🌌`,
        (a, b) => `${a.username} ve ${b.username}, bu uyum oranı evrenin sırrını çözüyor. 🌠`,
        (a, b) => `Efsaneler gerçektir: ${a.username} ❤️ ${b.username}. Dünya bu aşkı konuşacak! 🔥`,
        (a, b) => `Birlikte her şeye hazırsınız. Kalp atışınız senkronize oldu! 🎶`,
    ];

    function shipEmbed(author, target, uyum) {
        let titleEmoji = '👑';
        let descriptionEmoji = '✨';
        let color = '#00FFFF'; 

        if (uyum < 30) {
            titleEmoji = '💀';
            descriptionEmoji = '💔';
            color = '#FF0000'; 
        } else if (uyum < 70) {
            titleEmoji = '⭐';
            descriptionEmoji = '💛';
            color = '#FFA500'; 
        }

        const filled = Math.round(uyum / 10);
        const empty = 10 - filled;
        const barText = '█'.repeat(filled) + '░'.repeat(empty);

        const romantik = romantikCumleler[Math.floor(Math.random() * romantikCumleler.length)](author, target);

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(`${titleEmoji} Efsanevi Ship Sonucu`)
            .setDescription(
                `**${author.username}** ve **${target.username}**'in Kader Çizgisi:\n\n` +
                `${descriptionEmoji} **TOPLAM UYUM PUANI:** **%${uyum}**\n` +
                `\`${barText}\`\n\n` + 
                `_${romantik}_`
            )
            .setImage('attachment://ship.jpg');
    }

    // --- 2. CANVAS GÖRSELİ OLUŞTURMA (Hizalama Düzeltildi) ---
    const canvas = Canvas.createCanvas(700, 350); 
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Sabitler
    const AVATAR_SIZE = 150; 
    const X1 = 80;
    const X2 = 700 - 80 - AVATAR_SIZE;
    const Y_AVATAR = 50;
    const Y_BAR = 280;
    const COLOR1 = '#00FFDD'; // Turkuaz neon
    const COLOR2 = '#FF00A0'; // Pembe neon
    
    // Yüzde Metni Sabitleri (Kesin Hizalama)
    const PERCENTAGE_VALUE = uyum.toString(); // Yüzde değeri
    const PERCENTAGE_FONT_SIZE = 72;
    const PERCENTAGE_Y = 150; // Metnin dikey merkez çizgisi
    const CIRCLE_RADIUS = 60;
    const HEART_Y = 220;

    const avatar1 = await Canvas.loadImage(target1.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatar2 = await Canvas.loadImage(target2.displayAvatarURL({ extension: 'png', size: 256 }));
    
    drawCircularImage(ctx, avatar1, X1, Y_AVATAR, AVATAR_SIZE, COLOR1);
    drawCircularImage(ctx, avatar2, X2, Y_AVATAR, AVATAR_SIZE, COLOR2);
    
    // İSİMLERİ YAZMA
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR1;
    ctx.fillText(target1.username, X1 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);
    ctx.fillStyle = COLOR2;
    ctx.fillText(target2.username, X2 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);
    
    // BÜYÜK YÜZDE METNİ VE İŞARETİ (Hizalama DÜZELTİLDİ)
    
    // 1. Yüzde Değeri
    ctx.font = `${PERCENTAGE_FONT_SIZE}px sans-serif`;
    ctx.textAlign = 'right'; // Metni sağa dayalı yap (Böylece %'den önceki kısım sabitlenir)
    ctx.fillStyle = '#FFFFFF'; 
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FF00A0'; 
    // Metin başlama noktası
    const TEXT_START_X = 360; 
    ctx.fillText(PERCENTAGE_VALUE, TEXT_START_X, PERCENTAGE_Y);

    // 2. Yüzde İşareti
    ctx.font = '40px sans-serif'; // Daha küçük font
    ctx.textAlign = 'left'; // Metni sola dayalı yap
    ctx.fillText('%', TEXT_START_X + 5, PERCENTAGE_Y);

    ctx.shadowBlur = 0; // Gölgeyi sıfırla

    // YÜZDE ÇERÇEVESİ (Metin ve % işareti artık merkezde)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // Merkez X pozisyonunu iki metnin ortasına ayarlıyoruz (350)
    // Merkez Y pozisyonunu metin fontunun 2/3'ü kadar yukarı taşıyoruz (150 - 2/3*72 ≈ 102)
    ctx.arc(350, 115, CIRCLE_RADIUS, 0, Math.PI * 2, true); 
    ctx.stroke();

    // KALPLER (Görseldeki gibi ortadaki alana)
    ctx.font = '72px sans-serif'; 
    ctx.fillStyle = '#FF00A0'; 
    ctx.fillText('❤️', 350, HEART_Y); 
    
    // EFSANEVİ UYUM ÇUBUĞU
    drawProgressBar(ctx, uyum, Y_BAR);

    const attachment = { files: [{ attachment: canvas.toBuffer(), name: 'ship.jpg' }] };
    const embed = shipEmbed(target1, target2, uyum);

    // --- BUTONLAR ve COLLECTOR (Tekrar Dene mantığı) ---
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ship_delete').setLabel('Sil').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ship_again').setLabel('Tekrar Dene (Rastgele)').setStyle(ButtonStyle.Success),
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row], ...attachment });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 300000 
    });

    collector.on('collect', async i => {
        if (i.customId === 'ship_delete') {
            await msg.delete().catch(() => {});
            collector.stop();
        }
        
        if (i.customId === 'ship_again') {
            const yeniUyum = Math.floor(Math.random() * 101);
            
            // Yeni Canvas çizimi
            const newCanvas = Canvas.createCanvas(700, 350);
            const newCtx = newCanvas.getContext('2d');
            
            newCtx.fillStyle = '#000000';
            newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
            
            drawCircularImage(newCtx, avatar1, X1, Y_AVATAR, AVATAR_SIZE, COLOR1);
            drawCircularImage(newCtx, avatar2, X2, Y_AVATAR, AVATAR_SIZE, COLOR2);

            // İsimler
            newCtx.font = '24px sans-serif';
            newCtx.textAlign = 'center';
            newCtx.fillStyle = COLOR1;
            newCtx.fillText(target1.username, X1 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);
            newCtx.fillStyle = COLOR2;
            newCtx.fillText(target2.username, X2 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);

            // Yeni Yüzde Metni (Düzeltilmiş Hizalama)
            newCtx.font = `${PERCENTAGE_FONT_SIZE}px sans-serif`;
            newCtx.textAlign = 'right';
            newCtx.fillStyle = '#FFFFFF'; 
            newCtx.shadowBlur = 10;
            newCtx.shadowColor = '#FF00A0'; 
            newCtx.fillText(yeniUyum.toString(), TEXT_START_X, PERCENTAGE_Y); 

            newCtx.font = '40px sans-serif';
            newCtx.textAlign = 'left';
            newCtx.fillText('%', TEXT_START_X + 5, PERCENTAGE_Y);

            newCtx.shadowBlur = 0; 
            
            // Yeni Yüzde Çerçevesi
            newCtx.strokeStyle = '#FFFFFF';
            newCtx.lineWidth = 4;
            newCtx.beginPath();
            newCtx.arc(350, 115, CIRCLE_RADIUS, 0, Math.PI * 2, true); 
            newCtx.stroke();

            // Kalp
            newCtx.font = '72px sans-serif';
            newCtx.fillStyle = '#FF00A0'; 
            newCtx.fillText('❤️', 350, HEART_Y); 
            
            // Yeni Uyum Çubuğu
            drawProgressBar(newCtx, yeniUyum, Y_BAR);

            const newAttachment = { files: [{ attachment: newCanvas.toBuffer(), name: 'ship.jpg' }] };
            const newEmbed = shipEmbed(target1, target2, yeniUyum);
            
            await i.update({ embeds: [newEmbed], components: [row], ...newAttachment });
        }
    });

    collector.on('end', async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
        await msg.edit({ components: [disabledRow] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ['aşk', 'uyum', 'love'] };
module.exports.help = { name: 'ship' };
