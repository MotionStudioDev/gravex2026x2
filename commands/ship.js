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

module.exports.run = async (client, message, args) => {
    // 1. Hedefleri Belirleme (İki kişi gerekli!)
    let target1 = message.author;
    let target2Member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

    // target2Member'ı User objesine çeviriyoruz.
    let target2;
    if (target2Member) {
        target2 = target2Member.user;
    }

    // Kullanım Hatalarını ve undefined kontrolünü güçlendirme
    if (!target2Member && args[0]) {
        // ID ile kullanıcı arama başarısız olursa
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
    
    // Botu ship'lemeyi engelle
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

    // Romantik cümleler (Mevcut koddan alındı)
    const romantikCumleler = [
        (a, b) => `Kader ${a.username} ile ${b.username}'i birleştirdi 💫`,
        (a, b) => `${a.username} ve ${b.username}, kalpleriniz aynı ritimde atıyor 💓`,
        (a, b) => `${a.username} ❤️ ${b.username} aşkının önünde kimse duramaz 🔥`,
        (a, b) => `Gökyüzü bile ${a.username} ile ${b.username}'i izliyor 🌌`,
        (a, b) => `Birlikte her şey daha güzel: ${a.username} + ${b.username} 🌹`,
        (a, b) => `${a.username} ve ${b.username}, aşkınız efsane olacak ✨`,
        (a, b) => `İki ruh, tek kalp: ${a.username} & ${b.username} 💕`
    ];

    // Embed üretici (Mevcut koddan alındı)
    function shipEmbed(author, target, uyum) {
        let emoji = '💖';
        if (uyum < 30) emoji = '💔';
        else if (uyum < 70) emoji = '💞';

        const filled = Math.round(uyum / 10);
        const gradient = ['🟥','🟧','🟨','🟩','🟦','🟪'];
        const bar = Array.from({ length: 10 }, (_, i) =>
            i < filled ? gradient[i % gradient.length] : '⬜'
        ).join('');

        // Embed metninde kullanıcı etiketlerini kullanıyoruz.
        const romantik = romantikCumleler[Math.floor(Math.random() * romantikCumleler.length)](author, target);

        return new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('💖 Grave Ship!')
            .setDescription(`${author} ❤️ ${target}\n\n${emoji} Uyum: **%${uyum}**\n${bar}\n\n_${romantik}_`)
            .setImage('attachment://ship.jpg');
    }

    // 2. Canvas Görseli Oluşturma
    const canvas = Canvas.createCanvas(700, 250);
    const ctx = canvas.getContext('2d');
    
    // Arka Plan Yükleme
    let background;
    try {
        background = await Canvas.loadImage('./assets/kalpli.jpg'); 
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Avatarları Yükleme
    const AVATAR_SIZE = 200;
    const avatar1 = await Canvas.loadImage(target1.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatar2 = await Canvas.loadImage(target2.displayAvatarURL({ extension: 'png', size: 256 }));
    
    // Yuvarlak Avatarları Çizme
    drawCircularImage(ctx, avatar1, 50, 25, AVATAR_SIZE);
    drawCircularImage(ctx, avatar2, 450, 25, AVATAR_SIZE);
    
    // Kalp Simgesi (Ortaya)
    ctx.font = '72px sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF0000';
    ctx.fillText('❤️', 350, 150); 
    
    // Uyum Yüzdesi Metni (Kalbin Altına)
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#FF69B4'; 
    ctx.fillText(`%${uyum}`, 350, 200);

    // İsimleri Yazma: İSTENMEDİĞİ İÇİN KALDIRILDI
    // ctx.fillText(target1.username, 150, 230); 
    // ctx.fillText(target2.username, 550, 230); 

    const attachment = { files: [{ attachment: canvas.toBuffer(), name: 'ship.jpg' }] };
    const embed = shipEmbed(target1, target2, uyum);

    // Butonlar (Mevcut koddan alındı)
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ship_delete').setLabel('Sil').setStyle(ButtonStyle.Danger),
        // Tekrar ship butonu şimdilik kapalı
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row], ...attachment });

    // Collector (Mevcut koddan alındı)
    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 30000
    });

    collector.on('collect', async i => {
        if (i.customId === 'ship_delete') {
            await msg.delete().catch(() => {});
            collector.stop();
        }
        // Tekrar ship mantığı (rastgelelik istenirse)
        if (i.customId === 'ship_again') {
             const yeniUyum = Math.floor(Math.random() * 101); 
             const newEmbed = shipEmbed(target1, target2, yeniUyum);
             await i.update({ embeds: [newEmbed], components: [row], ...attachment });
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
