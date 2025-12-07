const { EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

// 1. Font Yükleme (Önemli: Eğer sunucunuzda Twitter'a yakın font yoksa, bu kısım hata verebilir.)
// Gerçek Twitter fontu "Chirp" veya "Segoe UI"dır. Varsayılan olarak Arial veya Sans-Serif kullanacağız.
// Eğer özel font kullanmak istiyorsanız, sunucunuza yüklemeli ve yolunu belirtmelisiniz.
try {
    // Örneğin, özel bir font yüklemek isterseniz:
    // registerFont(path.join(__dirname, 'assets', 'Twitter_Chirp.otf'), { family: 'Twitter' });
} catch (e) {
    console.warn("Özel font yüklenemedi. Varsayılan sistem fontları kullanılacak.");
}


module.exports.run = async (client, message, args) => {
    
    // Kullanıcı mesajından tweet içeriğini al
    const tweetContent = args.join(' ');
    
    if (!tweetContent) {
        const helpEmbed = new EmbedBuilder()
            .setColor('Blue')
            .setDescription('Kullanım: `g!tweet <tweet içeriği>`');
        return message.channel.send({ embeds: [helpEmbed] });
    }

    // Yükleniyor Mesajı
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Tweet görseli hazırlanıyor...');
    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    try {
        // --- 1. Canvas Ayarları ---
        const WIDTH = 600;
        const HEIGHT = 400; // Başlangıç yüksekliği
        const PADDING = 20;

        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');
        
        // Arkaplan
        ctx.fillStyle = '#15202B'; // Koyu Twitter teması
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // --- 2. Profil Resmi (Avatar) ---
        const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 128 });
        const avatar = await loadImage(avatarURL);
        const avatarSize = 50;
        const avatarX = PADDING;
        const avatarY = PADDING;

        // Yuvarlak Avatar Maskesi
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // --- 3. Kullanıcı Adı ve Etiketi ---
        const name = message.member.displayName || message.author.username;
        const usernameTag = `@${message.author.username}`;
        
        ctx.fillStyle = '#FFFFFF'; // Beyaz (İsim)
        ctx.font = 'bold 18px Arial';
        ctx.fillText(name, avatarX + avatarSize + 10, avatarY + 20);

        ctx.fillStyle = '#8899A6'; // Gri (Etiket)
        ctx.font = '16px Arial';
        ctx.fillText(usernameTag, avatarX + avatarSize + 10, avatarY + 40);

        // --- 4. Tweet Metni (Otomatik Satır Atlatma ve Yükseklik Ayarlama) ---
        const textX = avatarX;
        let textY = avatarY + avatarSize + 30;
        const maxWidth = WIDTH - 2 * PADDING;
        const lineHeight = 28;
        
        // Koyu Twitter temasına uygun metin rengi
        ctx.fillStyle = '#FFFFFF'; 
        ctx.font = '22px Arial';
        
        // Metin sarmalama (Wrap Text) fonksiyonu
        const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
            const words = text.split(' ');
            let line = '';
            let metrics;
            let currentY = y;

            for(let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                metrics = context.measureText(testLine);
                const testWidth = metrics.width;
                
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(line, x, currentY);
                    line = words[n] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            context.fillText(line, x, currentY);
            return currentY; // Son Y koordinatını döndür
        }

        const finalY = wrapText(ctx, tweetContent, textX, textY, maxWidth, lineHeight);
        
        // --- 5. Zaman ve Tarih ---
        const date = new Date();
        const time = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
        
        // Tweet'in alt kısmı (zaman)
        const timeText = `${time} · ${dateStr} ·Grave Discord Bot`;
        
        // Canvas yüksekliğini metne göre ayarla (Eğer metin kısa ise varsayılan 400'den küçük kalabilir)
        const finalHeight = Math.max(finalY + lineHeight + 50, HEIGHT);
        
        // Yeni bir canvas oluşturup eskisini kopyalamak yerine,
        // Yüksekliği ayarlamak için transform kullanabiliriz veya yeniden çizim yapabiliriz.
        // Ancak bu örnekte, yeterince büyük bir tuval üzerinde finalY'yi kullanacağız.

        // Zamanı yerleştir
        ctx.fillStyle = '#8899A6'; // Gri
        ctx.font = '14px Arial';
        ctx.fillText(timeText, textX, finalY + lineHeight + 10);
        
        // --- 6. Dosya Çıktısı ---
        const imageBuffer = canvas.toBuffer('image/png');
        const file = { attachment: imageBuffer, name: 'simulated_tweet.png' };

        // Mesajı güncelle
        const tweetEmbed = new EmbedBuilder()
            .setColor('#1DA1F2') // Twitter Mavisi
            .setTitle('🐦 Twitter Tweet Simülasyonu')
            .setDescription(`**${name}** adlı kullanıcının tweeti:`)
            .setImage('attachment://simulated_tweet.png')
            .setFooter({ text: 'Bu görsel xAI & MotionAI kullanılarak oluşturulmuştur.' });
        
        await msg.edit({ embeds: [tweetEmbed], files: [file] });

    } catch (error) {
        console.error('Tweet görseli oluşturulurken hata:', error);
        await msg.edit({ 
            embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Görsel Hatası').setDescription('Tweet görseli oluşturulamadı. Lütfen botun konsolunu kontrol edin.')] 
        }).catch(() => {});
    }
};

module.exports.conf = {
    aliases: ['twt', 'fakedweet'],
};

module.exports.help = {
    name: 'tweet',
};
