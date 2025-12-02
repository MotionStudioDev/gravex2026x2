const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

// Görseldeki renklere yakın sabitler
const DISCORD_BG = '#2f3136'; // Discord Embed Arkaplanı
const BAR_BG = '#4f545c'; // Boş çubuk rengi (Koyu Gri)
const BAR_FILL = '#ffcc00'; // Sarı Dolgu Rengi
const TEXT_LIGHT = '#FFFFFF'; // Açık Renk Yazı
const TEXT_GRAY = '#B9BBBE'; // Açıklama Yazısı Rengi

// Yardımcı fonksiyon: İlerleme çubuğu rengini ve Embed rengini belirler
function getColorByPing(ping) {
    if (ping <= 50) return '#00aa00'; // Yeşil (Embed Rengi)
    if (ping <= 150) return '#ffcc00'; // Sarı (Embed Rengi)
    if (ping <= 300) return '#ff6600'; // Turuncu (Embed Rengi)
    return '#ff0000'; // Kırmızı (Embed Rengi)
}

module.exports.run = async (client, message, args) => {
    // Ping komutlarında kullanılan standart yüklenme embed'i
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Lütfen bekleyin, ağ verileri analiz ediliyor ve görsel oluşturuluyor...')
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    const apiPing = Math.round(client.ws.ping);
    const embedColor = getColorByPing(apiPing); // Embed için renk

    // --- CANVAS İLE RESİM OLUŞTURMA ---
    const width = 600; 
    const height = 180; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // **1. Arkaplan ve Ana Çizim Alanı (Görseldeki Embed Arkaplanını Taklit Ediyoruz)**
    ctx.fillStyle = DISCORD_BG; 
    ctx.fillRect(0, 0, width, height);
    
    // **2. Başlık ve Değerler**
    const PING_VALUE_WIDTH = 120;
    const BAR_WIDTH = width - 80 - PING_VALUE_WIDTH; // 400 civarı
    const BAR_HEIGHT = 40;
    const X_OFFSET = 40;
    
    // SİSTEM GECİKMESİ (API) Başlığı
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = TEXT_LIGHT; 
    ctx.fillText('SİSTEM GECİKMESİ (API)', X_OFFSET, 50);

    // Ping MS Değeri
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = TEXT_LIGHT; 
    ctx.textAlign = 'right';
    ctx.fillText(`${apiPing} MS`, width - X_OFFSET, 50);

    // **3. İlerleme Çubuğu Çizimi**
    
    // Boş Çubuk (Tamamı)
    ctx.fillStyle = BAR_BG; 
    ctx.beginPath();
    ctx.roundRect(X_OFFSET, 80, BAR_WIDTH, BAR_HEIGHT, BAR_HEIGHT / 2);
    ctx.fill();

    // Dolu Çubuk (Ping Değerine Göre)
    // Dolu alanın boyutu, max 500ms'ye göre hesaplanır. (0ms=Tam dolu, 500ms=Boş)
    const filledRatio = Math.max(0, Math.min(1, (500 - apiPing) / 500)); 
    const filledBarWidth = BAR_WIDTH * filledRatio;
    
    // Gölgelendirme (Glow Effect) Ayarları
    ctx.shadowColor = BAR_FILL;
    ctx.shadowBlur = 10;
    ctx.fillStyle = BAR_FILL;

    ctx.beginPath();
    ctx.roundRect(X_OFFSET, 80, filledBarWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    ctx.fill();

    // Gölgelendirmeyi Kapat
    ctx.shadowBlur = 0;

    // **4. Alt Açıklama**
    ctx.font = '14px sans-serif';
    ctx.fillStyle = TEXT_GRAY;
    ctx.textAlign = 'center';
    ctx.fillText('Discord API sunucularına olan anlık bağlantı gecikmesi.', width / 2, 160);

    // Resmi Buffer olarak dışa aktar ve Attachment olarak hazırla
    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'ping-analiz.png' });

    // --- Embed Oluşturma ---
    const resultEmbed = new EmbedBuilder()
        .setColor(embedColor) 
        .setImage('attachment://ping-analiz.png') // Oluşturduğumuz resmi Embed'e ekliyoruz!
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true })) 
        .setTitle('🌐 Ağ Bağlantı Analizi') // Ana başlık (Görselin üstündeki)
        .setDescription(`Discord API sunucuları ile bot arasındaki gecikme **${apiPing} ms**'dir.`)
        .setFooter({ text: `Talep: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    await msg.edit({ content: '\u200b', embeds: [resultEmbed], files: [attachment] });
};

module.exports.conf = {
  aliases: ["ağ", "network"]
};

module.exports.help = {
  name: 'ping'
};
