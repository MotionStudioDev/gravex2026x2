const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas');

// Canvas kütüphanesinin fontu yüklemesini bekleyelim (Önemli!)
// Canvas.registerFont('./assets/fontlar/sans.ttf', { family: 'DiscordFont' }); 

/**
 * Canvas üzerine resmi yuvarlak kırparak çizer.
 * @param {Canvas.CanvasRenderingContext2D} ctx - Canvas bağlamı (context).
 * @param {Canvas.Image} image - Çizilecek resim (Avatar).
 * @param {number} x - X koordinatı.
 * @param {number} y - Y koordinatı.
 * @param {number} size - Resmin boyutu (genişlik ve yükseklik).
 */
function drawCircularImage(ctx, image, x, y, size) {
    ctx.save();
    ctx.beginPath();
    // Daire şeklindeki kırpma maskesini oluşturma
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    // Resmi çizme
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
}

/**
 * Canvas üzerine profesyonel uyum çubuğu çizer.
 * @param {Canvas.CanvasRenderingContext2D} ctx - Canvas bağlamı (context).
 * @param {number} uyum - Uyum yüzdesi (0-100).
 */
function drawProgressBar(ctx, uyum) {
    const BAR_WIDTH = 600;
    const BAR_HEIGHT = 20;
    const X = 50;
    const Y = 200;
    const RADIUS = 10; // Köşe yuvarlama

    // 1. Arka Planı Çiz (Gri/Beyaz çerçeve)
    ctx.fillStyle = '#CCCCCC';
    ctx.beginPath();
    ctx.roundRect(X, Y, BAR_WIDTH, BAR_HEIGHT, RADIUS);
    ctx.fill();

    // 2. Dolu Kısmı Çiz
    const fillWidth = (uyum / 100) * BAR_WIDTH;
    
    // Geçişli Renk (Gradient) oluşturma: Kırmızıdan Maviye
    const gradient = ctx.createLinearGradient(X, Y, X + BAR_WIDTH, Y);
    if (uyum <= 50) {
        // Düşük uyum: Kırmızıdan Sarıya
        gradient.addColorStop(0, '#FF0000'); // Kırmızı
        gradient.addColorStop(1, '#FFD700'); // Sarı
    } else {
        // Yüksek uyum: Yeşilden Pembeye
        gradient.addColorStop(0, '#32CD32'); // Limon Yeşili
        gradient.addColorStop(1, '#FF69B4'); // Pembe
    }
    
    // Geçişli rengi uygula
    ctx.fillStyle = gradient;
    
    // Yuvarlatılmış köşeler için sadece doluluk kadar alan çizilir
    ctx.beginPath();
    // Doluluk oranı 0'dan büyükse çizime başla
    if (fillWidth > 0) {
        ctx.roundRect(X, Y, fillWidth, BAR_HEIGHT, RADIUS);
        ctx.fill();
    }

    // 3. Yüzde Metni (Çubuğun Üzerine)
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(`%${uyum}`, X + fillWidth / 2, Y + BAR_HEIGHT / 2 + 5); 
}


module.exports.run = async (client, message, args) => {
    // 1. Hedefleri Belirleme
    let target1 = message.author;
    let target2Member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

    let target2;
    if (target2Member) {
        target2 = target2Member.user;
    }

    // Kullanım Hatalarını ve undefined kontrolünü güçlendirme
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
    
    // Aynı sonucu vermek için ID'leri birleştirerek 'tohum' (seed) oluşturma
    const sortedIds = [target1.id, target2.id].sort().join('');
    let seed = 0;
    for (let i = 0; i < sortedIds.length; i++) {
        seed += sortedIds.charCodeAt(i);
    }
    const uyum = (seed * 97) % 101; // Tutarlı yüzde hesaplama
    
    // Romantik cümleler
    const romantikCumleler = [
        (a, b) => `Kader ${a.username} ile ${b.username}'i birleştirdi 💫`,
        (a, b) => `${a.username} ve ${b.username}, kalpleriniz aynı ritimde atıyor 💓`,
        (a, b) => `${a.username} ❤️ ${b.username} aşkının önünde kimse duramaz 🔥`,
        (a, b) => `Birlikte her şey daha güzel: ${a.username} + ${b.username} 🌹`,
        (a, b) => `${a.username} ve ${b.username}, aşkınız efsane olacak ✨`,
        (a, b) => `İki ruh, tek kalp: ${a.username} & ${b.username} 💕`,
        (a, b) => `Bu uyum, gökyüzündeki yıldızları bile kıskandırır! 🌟`
    ];

    // Embed Üretici (Canvas ile senkronize)
    function shipEmbed(author, target, uyum) {
        let emoji = '💖';
        let descriptionEmoji = '✨';
        let color = '#FF69B4'; // Pembe

        if (uyum < 30) {
            emoji = '💔';
            descriptionEmoji = '⚠️';
            color = '#FF0000'; // Kırmızı
        } else if (uyum < 70) {
            emoji = '💞';
            descriptionEmoji = '💛';
            color = '#FFD700'; // Altın sarısı
        }

        // Embed metninde uyum çubuğunu da gösterelim (Görseli desteklemek için)
        const filled = Math.round(uyum / 10);
        const empty = 10 - filled;
        const barText = '█'.repeat(filled) + '░'.repeat(empty);

        const romantik = romantikCumleler[Math.floor(Math.random() * romantikCumleler.length)](author, target);

        return new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} ${author.username} ve ${target.username} Ship Sonucu`)
            .setDescription(
                `${descriptionEmoji} **UYUM PUANI:** **%${uyum}**\n` +
                `\`${barText}\`\n\n` + 
                `_${romantik}_`
            )
            .setImage('attachment://ship.jpg');
    }

    // 2. Canvas Görseli Oluşturma (Boyut büyütüldü)
    const canvas = Canvas.createCanvas(700, 300); // Yüksekliği artırıldı
    const ctx = canvas.getContext('2d');
    
    // Arka Planı Beyaz veya Açık Gri yapalım (Varsayılan)
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Avatarları Yükleme
    const AVATAR_SIZE = 150; // Boyut biraz küçültüldü
    const X1 = 80;
    const X2 = 700 - 80 - AVATAR_SIZE;
    const Y_AVATAR = 40;

    const avatar1 = await Canvas.loadImage(target1.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatar2 = await Canvas.loadImage(target2.displayAvatarURL({ extension: 'png', size: 256 }));
    
    // Yuvarlak Avatarları Çizme ve Çerçeve Ekleme
    ctx.strokeStyle = '#FFFFFF'; // Beyaz çerçeve
    ctx.lineWidth = 6;
    
    // Avatar 1
    drawCircularImage(ctx, avatar1, X1, Y_AVATAR, AVATAR_SIZE);
    ctx.beginPath();
    ctx.arc(X1 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 3, 0, Math.PI * 2, true);
    ctx.stroke();

    // Avatar 2
    drawCircularImage(ctx, avatar2, X2, Y_AVATAR, AVATAR_SIZE);
    ctx.beginPath();
    ctx.arc(X2 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 3, 0, Math.PI * 2, true);
    ctx.stroke();
    
    // KALIN YÜZDE METNİ (Ortaya)
    ctx.font = '80px sans-serif'; // Büyük font
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF69B4'; // Pembe renk
    ctx.fillText(`${uyum}%`, 350, 120); 

    // KALPLER VE İSİM AYIRICI
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#FF0000';
    ctx.fillText('❤️', 350, 180); 
    
    // ULTRA GELİŞMİŞ UYUM ÇUBUĞU
    drawProgressBar(ctx, uyum);

    const attachment = { files: [{ attachment: canvas.toBuffer(), name: 'ship.jpg' }] };
    const embed = shipEmbed(target1, target2, uyum);

    // Butonlar
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ship_delete').setLabel('Sil').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ship_again').setLabel('Tekrar Dene (Rastgele)').setStyle(ButtonStyle.Success),
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row], ...attachment });

    // Collector ve Tekrar Deneme Mantığı
    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 300000 // 5 dakika
    });

    collector.on('collect', async i => {
        if (i.customId === 'ship_delete') {
            await msg.delete().catch(() => {});
            collector.stop();
        }
        
        if (i.customId === 'ship_again') {
            // Rastgele uyum hesaplama
            const yeniUyum = Math.floor(Math.random() * 101);
            
            // Yeni Canvas görseli oluşturma (Yeni uyum ile)
            const newCanvas = Canvas.createCanvas(700, 300);
            const newCtx = newCanvas.getContext('2d');
            newCtx.fillStyle = '#F0F0F0';
            newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
            
            // Avatarları ve çerçeveleri tekrar çizme
            drawCircularImage(newCtx, avatar1, X1, Y_AVATAR, AVATAR_SIZE);
            drawCircularImage(newCtx, avatar2, X2, Y_AVATAR, AVATAR_SIZE);
            newCtx.strokeStyle = '#FFFFFF'; 
            newCtx.lineWidth = 6;
            newCtx.beginPath();
            newCtx.arc(X1 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 3, 0, Math.PI * 2, true);
            newCtx.stroke();
            newCtx.beginPath();
            newCtx.arc(X2 + AVATAR_SIZE / 2, Y_AVATAR + AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 3, 0, Math.PI * 2, true);
            newCtx.stroke();

            // Yeni yüzde ve kalp
            newCtx.font = '80px sans-serif';
            newCtx.textAlign = 'center';
            newCtx.fillStyle = '#FF69B4'; 
            newCtx.fillText(`${yeniUyum}%`, 350, 120);
            newCtx.font = '40px sans-serif';
            newCtx.fillStyle = '#FF0000';
            newCtx.fillText('❤️', 350, 180); 
            
            // Yeni uyum çubuğunu çizme
            drawProgressBar(newCtx, yeniUyum);

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
