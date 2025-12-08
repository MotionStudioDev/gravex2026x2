const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas');

// İsteğe bağlı: Daha profesyonel fontlar yüklemek için (Sunucunuzda yüklü olmalı)
// try {
//     Canvas.registerFont('./assets/fontlar/Montserrat-Bold.ttf', { family: 'ShipFont' }); 
// } catch (e) {
//     console.warn("ShipFont yüklenemedi, varsayılan font kullanılacak.");
// }

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
 * Profesyonel uyum çubuğu çizer (Altın/Gümüş renkli).
 */
function drawProgressBar(ctx, uyum, Y_POS) {
    const BAR_WIDTH = 600;
    const BAR_HEIGHT = 20;
    const X = 50;
    const RADIUS = 10; 

    // 1. Arka Planı Çiz (Koyu Gri)
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.roundRect(X, Y_POS, BAR_WIDTH, BAR_HEIGHT, RADIUS);
    ctx.fill();

    // 2. Dolu Kısmı Çiz (Altın/Gümüş Gradient)
    const fillWidth = (uyum / 100) * BAR_WIDTH;
    
    const gradient = ctx.createLinearGradient(X, Y_POS, X + BAR_WIDTH, Y_POS);
    // Yüksek uyum: Altın rengi
    if (uyum >= 70) {
        gradient.addColorStop(0, '#FFD700'); // Altın
        gradient.addColorStop(1, '#FFCC00'); // Koyu Altın
    } 
    // Orta uyum: Gümüş rengi
    else if (uyum >= 40) {
        gradient.addColorStop(0, '#C0C0C0'); // Gümüş
        gradient.addColorStop(1, '#A9A9A9'); // Koyu Gümüş
    } 
    // Düşük uyum: Bakır/Kırmızı rengi
    else {
        gradient.addColorStop(0, '#CD5C5C'); // Hint Kırmızısı
        gradient.addColorStop(1, '#8B0000'); // Koyu Kırmızı
    }
    
    ctx.fillStyle = gradient;
    if (fillWidth > 0) {
        ctx.beginPath();
        ctx.roundRect(X, Y_POS, fillWidth, BAR_HEIGHT, RADIUS);
        ctx.fill();
    }

    // 3. Yüzde Metni (Bar Üzerinde)
    ctx.font = '16px "ShipFont", sans-serif';
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
    
    // --- UYUM HESAPLAMA (Aynı kaldı) ---
    const sortedIds = [target1.id, target2.id].sort().join('');
    let seed = 0;
    for (let i = 0; i < sortedIds.length; i++) {
        seed += sortedIds.charCodeAt(i);
    }
    const uyum = (seed * 97) % 101; 
    
    // --- ROMANTİK CÜMLELER (Daha dramatik) ---
    const romantikCumleler = [
        (a, b) => `İki yıldızın çarpışması: ${a.username} ve ${b.username}'in kaderi yeniden yazıldı! 🌌`,
        (a, b) => `${a.username} ve ${b.username}, bu uyum oranı evrenin sırrını çözüyor. 🌠`,
        (a, b) => `Efsaneler gerçektir: ${a.username} ❤️ ${b.username}. Dünya bu aşkı konuşacak! 🔥`,
        (a, b) => `Birlikte her şeye hazırsınız. Kalp atışınız senkronize oldu! 🎶`,
    ];

    // --- EMBED ÜRETİCİSİ (Daha dramatik ve renkli) ---
    function shipEmbed(author, target, uyum) {
        let titleEmoji = '👑';
        let descriptionEmoji = '✨';
        let color = '#00FFFF'; // Mavi Neon

        if (uyum < 30) {
            titleEmoji = '💀';
            descriptionEmoji = '💔';
            color = '#FF0000'; // Kırmızı
        } else if (uyum < 70) {
            titleEmoji = '⭐';
            descriptionEmoji = '💛';
            color = '#FFA500'; // Turuncu
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

    // --- 2. CANVAS GÖRSELİ OLUŞTURMA (Efsanevi) ---
    const canvas = Canvas.createCanvas(700, 350); // Yüksekliği artırıldı
    const ctx = canvas.getContext('2d');
    
    // Arka Planı SİYAH yapalım (Neon etkisi için)
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

    // Avatarları Yükleme
    const avatar1 = await Canvas.loadImage(target1.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatar2 = await Canvas.loadImage(target2.displayAvatarURL({ extension: 'png', size: 256 }));
    
    // Yuvarlak Avatarları ve Neon Çerçeveleri Çizme
    drawCircularImage(ctx, avatar1, X1, Y_AVATAR, AVATAR_SIZE, COLOR1);
    drawCircularImage(ctx, avatar2, X2, Y_AVATAR, AVATAR_SIZE, COLOR2);
    
    // İSİMLERİ YAZMA
    ctx.font = '24px "ShipFont", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR1;
    ctx.fillText(target1.username, X1 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);
    
    ctx.fillStyle = COLOR2;
    ctx.fillText(target2.username, X2 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);
    
    // BÜYÜK YÜZDE METNİ (Ortada)
    const PERCENTAGE_X = 350;
    const PERCENTAGE_Y = 150;
    
    ctx.font = '72px "ShipFont", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF'; // Beyaz Metin
    
    // Metin GLOW efekti
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FF00A0'; 
    ctx.fillText(`${uyum}%`, PERCENTAGE_X, PERCENTAGE_Y);
    ctx.shadowBlur = 0; // Gölgeyi sıfırla

    // YÜZDE ÇERÇEVESİ (Daha fazla estetik)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(PERCENTAGE_X, PERCENTAGE_Y - 20, 60, 0, Math.PI * 2, true);
    ctx.stroke();

    // KALPLER (Avatarlardan ortaya doğru)
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#FF00A0'; 
    ctx.fillText('❤️', 350, 220); 
    
    // EFSANEVİ UYUM ÇUBUĞU
    drawProgressBar(ctx, uyum, Y_BAR);

    const attachment = { files: [{ attachment: canvas.toBuffer(), name: 'ship.jpg' }] };
    const embed = shipEmbed(target1, target2, uyum);

    // --- BUTONLAR ve COLLECTOR (Tekrar Dene mantığı ile aynı) ---
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
            
            // SİYAH Arka Plan
            newCtx.fillStyle = '#000000';
            newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
            
            // Avatarlar
            drawCircularImage(newCtx, avatar1, X1, Y_AVATAR, AVATAR_SIZE, COLOR1);
            drawCircularImage(newCtx, avatar2, X2, Y_AVATAR, AVATAR_SIZE, COLOR2);

            // İsimler
            newCtx.font = '24px "ShipFont", sans-serif';
            newCtx.textAlign = 'center';
            newCtx.fillStyle = COLOR1;
            newCtx.fillText(target1.username, X1 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);
            newCtx.fillStyle = COLOR2;
            newCtx.fillText(target2.username, X2 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE + 30);

            // Yüzde Metni
            newCtx.font = '72px "ShipFont", sans-serif';
            newCtx.textAlign = 'center';
            newCtx.fillStyle = '#FFFFFF'; 
            newCtx.shadowBlur = 10;
            newCtx.shadowColor = '#FF00A0'; 
            newCtx.fillText(`${yeniUyum}%`, PERCENTAGE_X, PERCENTAGE_Y);
            newCtx.shadowBlur = 0; 
            
            // Yüzde Çerçevesi
            newCtx.strokeStyle = '#FFFFFF';
            newCtx.lineWidth = 4;
            newCtx.beginPath();
            newCtx.arc(PERCENTAGE_X, PERCENTAGE_Y - 20, 60, 0, Math.PI * 2, true);
            newCtx.stroke();

            // Kalp
            newCtx.font = '40px sans-serif';
            newCtx.fillStyle = '#FF00A0'; 
            newCtx.fillText('❤️', 350, 220); 
            
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
