const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas');

// --- YARDIMCI FONKSİYONLAR ---

/**
 * Resmi yuvarlak kırparak ve GLOW efekti ekleyerek çizer.
 */
function drawCircularImage(ctx, image, x, y, size, color) {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = color; 
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
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
    const BAR_HEIGHT = 25; 
    const X = 50;
    const RADIUS = 12; 

    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.roundRect(X, Y_POS, BAR_WIDTH, BAR_HEIGHT, RADIUS);
    ctx.fill();

    const fillWidth = (uyum / 100) * BAR_WIDTH;
    const gradient = ctx.createLinearGradient(X, Y_POS, X + BAR_WIDTH, Y_POS);
    gradient.addColorStop(0, '#FFC72C'); 
    gradient.addColorStop(0.5, '#FF7F50'); 
    gradient.addColorStop(1, '#DC143C'); 
    
    ctx.fillStyle = gradient;
    if (fillWidth > 0) {
        ctx.beginPath();
        ctx.roundRect(X, Y_POS, fillWidth, BAR_HEIGHT, RADIUS);
        ctx.fill();
    }

    ctx.font = '16px sans-serif'; 
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(`%${uyum}`, X + fillWidth / 2, Y_POS + BAR_HEIGHT / 2 + 5); 
}

module.exports.run = async (client, message, args) => {
    // --- 1. HEDEFLERİ BELİRLEME VE HATA KONTROLÜ (Aynı kaldı) ---
    let target1 = message.author;
    let target2Member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    let target2 = target2Member ? target2Member.user : null;

    if (!target2Member && args[0]) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanım Hatası').setDescription('Belirtilen ID veya etiket ile bir kullanıcı bulamadım.')] });
    if (message.mentions.members.size === 1 && target2.id === message.author.id) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanım Hatası').setDescription('Lütfen kendinizden farklı bir kişiyi etiketleyin.')] });
    if (message.mentions.members.size === 2 && target1.id === target2.id) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanım Hatası').setDescription('İki farklı kişiyi etiketlemelisiniz.')] });
    if (!target2) return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanım Hatası').setDescription('Lütfen iki farklı kişiyi etiketleyin veya bir kişiyi etiketleyerek kendinizle ship yapın.')] });
    if (target1.bot || target2.bot) return message.reply("🤖 Botlar aşkı kaldıramaz! Lütfen sadece kullanıcıları ship'leyin.");
    
    // --- UYUM HESAPLAMA ---
    const sortedIds = [target1.id, target2.id].sort().join('');
    let seed = 0;
    for (let i = 0; i < sortedIds.length; i++) { seed += sortedIds.charCodeAt(i); }
    const uyum = (seed * 97) % 101; 
    
    // --- ROMANTİK CÜMLELER ve EMBED ÜRETİCİSİ (Aynı kaldı) ---
    const romantikCumleler = [
        (a, b) => `İki yıldızın çarpışması: ${a.username} ve ${b.username}'in kaderi yeniden yazıldı! 🌌`,
        (a, b) => `${a.username} ve ${b.username}, bu uyum oranı evrenin sırrını çözüyor. 🌠`,
        (a, b) => `Efsaneler gerçektir: ${a.username} ❤️ ${b.username}. Dünya bu aşkı konuşacak! 🔥`,
        (a, b) => `Birlikte her şeye hazırsınız. Kalp atışınız senkronize oldu! 🎶`,
    ];

    function shipEmbed(author, target, uyum) {
        let titleEmoji = '👑'; let descriptionEmoji = '✨'; let color = '#00FFFF'; 
        if (uyum < 30) { titleEmoji = '💀'; descriptionEmoji = '💔'; color = '#FF0000'; } 
        else if (uyum < 70) { titleEmoji = '⭐'; descriptionEmoji = '💛'; color = '#FFA500'; }
        const filled = Math.round(uyum / 10); const empty = 10 - filled; const barText = '█'.repeat(filled) + '░'.repeat(empty);
        const romantik = romantikCumleler[Math.floor(Math.random() * romantikCumleler.length)](author, target);
        return new EmbedBuilder().setColor(color).setTitle(`${titleEmoji} Efsanevi Ship Sonucu`).setDescription(`**${author.username}** ve **${target.username}**'in Kader Çizgisi:\n\n${descriptionEmoji} **TOPLAM UYUM PUANI:** **%${uyum}**\n\`${barText}\`\n\n_${romantik}_`).setImage('attachment://ship.jpg');
    }

    // --- 2. CANVAS GÖRSELİ OLUŞTURMA (KESİN HİZALAMA DÜZELTMESİ) ---
    const canvas = Canvas.createCanvas(700, 350); 
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const AVATAR_SIZE = 150; const X1 = 80; const X2 = 700 - 80 - AVATAR_SIZE; const Y_AVATAR = 50;
    const COLOR1 = '#00FFDD'; const COLOR2 = '#FF00A0';
    
    // Yüzde Metni ve Çember Sabitleri
    const PERCENTAGE_FONT_SIZE = 72; // Font tekrar büyütüldü
    const CIRCLE_RADIUS = 70; 
    const CIRCLE_CENTER_X = 350;
    const CIRCLE_CENTER_Y = Y_AVATAR + AVATAR_SIZE / 2; 
    const Y_BAR = 280;

    const avatar1 = await Canvas.loadImage(target1.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatar2 = await Canvas.loadImage(target2.displayAvatarURL({ extension: 'png', size: 256 }));
    
    drawCircularImage(ctx, avatar1, X1, Y_AVATAR, AVATAR_SIZE, COLOR1);
    drawCircularImage(ctx, avatar2, X2, Y_AVATAR, AVATAR_SIZE, COLOR2);
    
    ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = COLOR1; ctx.fillText(target1.username, X1 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);
    ctx.fillStyle = COLOR2; ctx.fillText(target2.username, X2 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);
    
    // --- KESİN HİZALANMIŞ YÜZDE METNİ ---
    ctx.font = `${PERCENTAGE_FONT_SIZE}px sans-serif`;
    const text = `${uyum}%`;
    const metrics = ctx.measureText(text);
    // Metnin gerçek yüksekliğini hesapla (yukarı ve aşağı taşmalar dahil)
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    // Metnin dikey merkezini çemberin merkezine oturtacak Y koordinatını hesapla
    const textY = CIRCLE_CENTER_Y + (textHeight / 2) - metrics.actualBoundingBoxDescent;

    // Yüzde Çerçevesi
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8;
    ctx.shadowBlur = 10; ctx.shadowColor = '#FF00A0'; 
    ctx.beginPath(); ctx.arc(CIRCLE_CENTER_X, CIRCLE_CENTER_Y, CIRCLE_RADIUS, 0, Math.PI * 2, true);
    ctx.stroke(); ctx.shadowBlur = 0; 

    // Yüzde Metni
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF'; ctx.shadowBlur = 10; ctx.shadowColor = '#FF00A0'; 
    ctx.fillText(text, CIRCLE_CENTER_X, textY); // Hesaplanan hassas Y konumu
    ctx.shadowBlur = 0; 
    
    // Kalp
    ctx.font = '40px sans-serif'; ctx.fillStyle = '#FF00A0'; ctx.textAlign = 'center';
    ctx.fillText('❤️', CIRCLE_CENTER_X, CIRCLE_CENTER_Y + CIRCLE_RADIUS + 25); 
    
    // Uyum Çubuğu
    drawProgressBar(ctx, uyum, Y_BAR);

    const attachment = { files: [{ attachment: canvas.toBuffer(), name: 'ship.jpg' }] };
    const embed = shipEmbed(target1, target2, uyum);

    // --- BUTONLAR ve COLLECTOR (Aynı kaldı) ---
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ship_delete').setLabel('Sil').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ship_again').setLabel('Tekrar Dene (Rastgele)').setStyle(ButtonStyle.Success),
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row], ...attachment });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 300000 });

    collector.on('collect', async i => {
        if (i.customId === 'ship_delete') { await msg.delete().catch(() => {}); collector.stop(); }
        
        if (i.customId === 'ship_again') {
            const yeniUyum = Math.floor(Math.random() * 101);
            
            // Yeni Canvas çizimi (Aynı kesin hizalama mantığıyla)
            const newCanvas = Canvas.createCanvas(700, 350); const newCtx = newCanvas.getContext('2d');
            newCtx.fillStyle = '#000000'; newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
            drawCircularImage(newCtx, avatar1, X1, Y_AVATAR, AVATAR_SIZE, COLOR1);
            drawCircularImage(newCtx, avatar2, X2, Y_AVATAR, AVATAR_SIZE, COLOR2);
            newCtx.font = '24px sans-serif'; newCtx.textAlign = 'center';
            newCtx.fillStyle = COLOR1; newCtx.fillText(target1.username, X1 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);
            newCtx.fillStyle = COLOR2; newCtx.fillText(target2.username, X2 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);

            newCtx.strokeStyle = '#FFFFFF'; newCtx.lineWidth = 8; newCtx.shadowBlur = 10; newCtx.shadowColor = '#FF00A0'; 
            newCtx.beginPath(); newCtx.arc(CIRCLE_CENTER_X, CIRCLE_CENTER_Y, CIRCLE_RADIUS, 0, Math.PI * 2, true);
            newCtx.stroke(); newCtx.shadowBlur = 0; 

            // KESİN HİZALAMA (Tekrar Dene kısmı için)
            newCtx.font = `${PERCENTAGE_FONT_SIZE}px sans-serif`;
            const newText = `${yeniUyum}%`;
            const newMetrics = newCtx.measureText(newText);
            const newTextHeight = newMetrics.actualBoundingBoxAscent + newMetrics.actualBoundingBoxDescent;
            const newTextY = CIRCLE_CENTER_Y + (newTextHeight / 2) - newMetrics.actualBoundingBoxDescent;

            newCtx.textAlign = 'center'; newCtx.fillStyle = '#FFFFFF'; newCtx.shadowBlur = 10; newCtx.shadowColor = '#FF00A0'; 
            newCtx.fillText(newText, CIRCLE_CENTER_X, newTextY);
            newCtx.shadowBlur = 0; 
            
            newCtx.font = '40px sans-serif'; newCtx.fillStyle = '#FF00A0'; 
            newCtx.fillText('❤️', CIRCLE_CENTER_X, CIRCLE_CENTER_Y + CIRCLE_RADIUS + 25); 
            drawProgressBar(newCtx, yeniUyum, Y_BAR);

            const newAttachment = { files: [{ attachment: newCanvas.toBuffer(), name: 'ship.jpg' }] };
            const newEmbed = shipEmbed(target1, target2, yeniUyum);
            await i.update({ embeds: [newEmbed], components: [row], ...newAttachment });
        }
    });
    collector.on('end', async () => { const disabledRow = new ActionRowBuilder().addComponents(row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))); await msg.edit({ components: [disabledRow] }).catch(() => {}); });
};

module.exports.conf = { aliases: ['aşk', 'uyum', 'love'] };
module.exports.help = { name: 'ship' };
