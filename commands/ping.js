const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

// --- Sabitler ve Yardımcı Fonksiyonlar ---

const BAR_BG_COLOR = '#40444b'; // Boş çubuk rengi (Discord koyu gri)
const TEXT_LIGHT = '#FFFFFF'; // Açık Renk Yazı
const TEXT_GRAY = '#B9BBBE'; // Açıklama Yazısı Rengi
const BUTTON_DURATION = 60000; // Butonun aktif kalacağı süre (60 saniye)

// Ping değerine göre bar dolgu rengini ve gölge rengini belirler (Görseldeki sarı tona uygun)
function getBarFillColor(ping) {
    if (ping <= 50) return '#00FF00'; // Parlak Yeşil
    if (ping <= 150) return '#FFCC00'; // Sarı (Görseldeki ana renk)
    if (ping <= 300) return '#FFA500'; // Turuncu
    return '#FF0000'; // Kırmızı
}

// Ping değerine göre Embed'in sol çizgi rengini belirler
function getEmbedColor(ping) {
    if (ping <= 50) return '#00aa00'; // Yeşil
    if (ping <= 150) return '#FFCC00'; // Sarı
    if (ping <= 300) return '#FF6600'; // Turuncu
    return '#FF0000'; // Kırmızı
}

// --- Ana Görsel Oluşturma Fonksiyonu ---

async function createPingImage(client, apiPing, authorTag) {
    const width = 600; 
    const height = 180; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Görseldeki Discord Arkaplanı
    const DISCORD_BG = '#2f3136'; 
    ctx.fillStyle = DISCORD_BG; 
    ctx.fillRect(0, 0, width, height);
    
    const PING_VALUE_WIDTH = 120;
    const BAR_WIDTH = width - 80 - PING_VALUE_WIDTH; 
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

    // Boş Çubuk (Arka Plan)
    ctx.fillStyle = BAR_BG_COLOR; 
    ctx.beginPath();
    // roundRect, yuvarlak köşeler için kullanılır
    ctx.roundRect(X_OFFSET, 80, BAR_WIDTH, BAR_HEIGHT, BAR_HEIGHT / 2);
    ctx.fill();

    // Dolu Çubuk (Ping Değerine Göre)
    const filledRatio = Math.max(0, Math.min(1, (500 - apiPing) / 500)); 
    const filledBarWidth = BAR_WIDTH * filledRatio;
    
    const barFillColor = getBarFillColor(apiPing);

    // Gölgelendirme (Glow Effect) Ayarları
    ctx.shadowColor = barFillColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = barFillColor;

    ctx.beginPath();
    ctx.roundRect(X_OFFSET, 80, filledBarWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    ctx.fill();

    // Gölgelendirmeyi Kapat
    ctx.shadowBlur = 0;

    // Alt Açıklama (İstediğiniz yeni metin)
    ctx.font = '14px sans-serif';
    ctx.fillStyle = TEXT_GRAY;
    ctx.textAlign = 'center';
    ctx.fillText('GraveBOT Güncel ping değerleri.', width / 2, 160); 

    // Resmi Buffer olarak dışa aktar
    const buffer = canvas.toBuffer('image/png');
    return new AttachmentBuilder(buffer, { name: 'ping.png' });
}


// --- Komut Çalıştırma Fonksiyonu ---

module.exports.run = async (client, message, args) => {
    // 1. Yükleniyor Mesajı
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Lütfen bekleyin, ağ verileri analiz ediliyor ve görsel oluşturuluyor...')
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // 2. İlk Ping Hesaplama ve Görsel Oluşturma
    const initialPing = Math.round(client.ws.ping);
    const attachment = await createPingImage(client, initialPing, message.author.tag);
    
    // 3. Buton Oluşturma
    const updateButton = new ButtonBuilder()
        .setCustomId('ping_update_button')
        .setLabel('Verileri Güncelle!')
        .setStyle(ButtonStyle.Primary); 

    const row = new ActionRowBuilder().addComponents(updateButton);

    // 4. Nihai Embed Oluşturma
    const resultEmbed = new EmbedBuilder()
        .setColor(getEmbedColor(initialPing)) 
        .setImage('attachment://ping.png') // Oluşturulan resmi Embed'e ekliyoruz!
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true })) 
        .setTitle('🌐 Ağ Bağlantı Analizi') 
        .setDescription(`Discord API sunucuları ile bot arasındaki gecikme **${initialPing} ms**'dir.`)
        .setFooter({ text: `Talep: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    // 5. Mesajı Gönderme (Buton dahil)
    await msg.edit({ 
        content: '\u200b', 
        embeds: [resultEmbed], 
        files: [attachment],
        components: [row] 
    });

    // --- BUTON İŞLEYİCİ (COLLECTOR) ---
    const filter = (interaction) => interaction.customId === 'ping_update_button' && interaction.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: BUTTON_DURATION });

    collector.on('collect', async (interaction) => {
        // Butona basıldığını Discord'a bildir
        await interaction.deferUpdate();

        // Yeni ping değerini al
        const newApiPing = Math.round(client.ws.ping);
        
        // Yeni görsel ve embed'i oluştur
        const newAttachment = await createPingImage(client, newApiPing, interaction.user.tag);
        const newEmbedColor = getEmbedColor(newApiPing);

        const newResultEmbed = new EmbedBuilder()
            .setColor(newEmbedColor) 
            .setImage('attachment://ping.png') 
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true })) 
            .setTitle('🌐 Ağ Bağlantı Analizi') 
            .setDescription(`Discord API sunucuları ile bot arasındaki gecikme **${newApiPing} ms**'dir.`)
            .setFooter({ text: `Talep: ${interaction.user.tag} (Güncellendi)`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });
        
        // Mesajı güncelle
        await interaction.editReply({ embeds: [newResultEmbed], files: [newAttachment] }).catch(() => {});
    });

    collector.on('end', async () => {
        // Süre bittiğinde butonu devre dışı bırak
        const disabledRow = new ActionRowBuilder().addComponents(
            updateButton.setDisabled(true)
        );
        await msg.edit({ components: [disabledRow] }).catch(() => {});
    });
};

module.exports.conf = {
  aliases: ["ağ", "network"]
};

module.exports.help = {
  name: 'ping'
};
