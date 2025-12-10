const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

// Sabitler
const TIME_LIMIT = 15000; // 15 saniye

// --------------------------------------------------------------------------------------
// CANVAS FONKSİYONU: Çay Görseli Oluşturma (YENİ FİNCAN ŞEKLİ)
// --------------------------------------------------------------------------------------
async function createTeaImage(color, sugar) {
    const width = 400;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Arkaplan
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // --- Fincan (Cup) Çizimi ---
    const cupBottomY = 350;
    const cupTopY = 150;
    const cupWidth = 200;
    const cupX = (width - cupWidth) / 2;

    // Fincan Gövdesi (Beyaz)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.moveTo(cupX, cupTopY); // Sol üst köşe
    ctx.lineTo(cupX - 20, cupBottomY); // Sol alt köşe (hafif geniş)
    ctx.lineTo(cupX + cupWidth + 20, cupBottomY); // Sağ alt köşe
    ctx.lineTo(cupX + cupWidth, cupTopY); // Sağ üst köşe
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Fincan Kolu (Basit bir yay)
    ctx.beginPath();
    ctx.arc(cupX + cupWidth + 50, cupTopY + 80, 40, 0, Math.PI * 2); // Merkez (x, y), Yarıçap
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 8;
    ctx.stroke();

    // --- Çay Sıvısı (Liquid) ---
    let teaColor = color === 'demli' ? '#652a0e' : '#a0522d'; 
    ctx.fillStyle = teaColor;
    const liquidTopY = cupTopY + 10;
    
    ctx.beginPath();
    ctx.moveTo(cupX + 5, liquidTopY); // Sol üst köşe
    ctx.lineTo(cupX - 15, cupBottomY - 5); // Sol alt
    ctx.lineTo(cupX + cupWidth + 15, cupBottomY - 5); // Sağ alt
    ctx.lineTo(cupX + cupWidth - 5, liquidTopY); // Sağ üst
    ctx.closePath();
    ctx.fill();
    
    // Çay Yüzeyi (Üstte hafif köpük/parlama)
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cupX + 5, liquidTopY);
    ctx.lineTo(cupX + cupWidth - 5, liquidTopY);
    ctx.stroke();
    
    // --- Buhar Efekti ---
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cupX + cupWidth / 2, cupTopY - 10);
    ctx.bezierCurveTo(cupX + cupWidth / 2 - 30, cupTopY - 50, cupX + cupWidth / 2 + 30, cupTopY - 50, cupX + cupWidth / 2, cupTopY - 80);
    ctx.stroke();
    
    // --- Şeker Durumu Yazısı (Doğru Konumda) ---
    ctx.fillStyle = '#333333';
    ctx.font = '30px Impact'; // Daha dikkat çekici font
    ctx.textAlign = 'center';
    ctx.fillText(sugar, width / 2, 50); 

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'cay_result.png' });
}
// --------------------------------------------------------------------------------------


// --------------------------------------------------------------------------------------
// KOMUT İŞLEYİCİ
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {
    
    // --- AŞAMA 1: DEMLİLİK SEÇİMİ ---
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('tea_demli')
            .setLabel('Demli Çay ☕')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('tea_acik')
            .setLabel('Açık Çay 🥛')
            .setStyle(ButtonStyle.Primary)
    );

    const initialEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🍵 Çay Siparişi Başlatıldı')
        .setDescription('Lütfen öncelikle çayınızın **demlilik** oranını seçin.')
        .setFooter({ text: `Seçim için ${TIME_LIMIT / 1000} saniyeniz var.` });

    const response = await message.channel.send({ embeds: [initialEmbed], components: [row1] });

    // Kolektör Filtresi (Sadece komutu başlatan kullanıcı ve 1. aşama butonları)
    const filter1 = (i) => i.user.id === message.author.id && (i.customId === 'tea_demli' || i.customId === 'tea_acik');
    
    // 1. Aşama Kolektörü
    const collector1 = response.createMessageComponentCollector({ 
        filter: filter1, 
        time: TIME_LIMIT, 
        max: 1, 
        componentType: ComponentType.Button 
    });

    let selectedDemlilik = '';
    
    collector1.on('collect', async i1 => {
        selectedDemlilik = i1.customId.split('_')[1]; // demli veya acik
        await i1.deferUpdate(); // Buton etkileşimini ertele

        // --- AŞAMA 2: ŞEKER SEÇİMİ ---
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tea_sekerli')
                .setLabel('Şekerli 🍬')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('tea_sekersiz')
                .setLabel('Şekersiz 🌿')
                .setStyle(ButtonStyle.Secondary)
        );

        const stage2Embed = new EmbedBuilder()
            .setColor('DarkBlue')
            .setTitle(`Çay Tipi: ${selectedDemlilik === 'demli' ? 'Demli' : 'Açık'}`)
            .setDescription('Şimdi de çayınızı **şekerli** mi yoksa **şekersiz** mi istersiniz?');

        // Mesajı 2. aşama butonları ile güncelle
        await response.edit({ embeds: [stage2Embed], components: [row2] });

        // 2. Aşama Kolektörü Filtresi (Sadece komutu başlatan kullanıcı ve 2. aşama butonları)
        const filter2 = (i) => i.user.id === message.author.id && (i.customId === 'tea_sekerli' || i.customId === 'tea_sekersiz');

        // 2. Aşama Kolektörü
        const collector2 = response.createMessageComponentCollector({ 
            filter: filter2, 
            time: TIME_LIMIT, 
            max: 1, 
            componentType: ComponentType.Button 
        });

        collector2.on('collect', async i2 => {
            const selectedSeker = i2.customId.split('_')[1]; // sekerli veya sekersiz
            
            // Canvas ile görseli oluştur
            const sugarLabel = selectedSeker === 'sekerli' ? 'Şekerli Çay' : 'Şekersiz Çay';
            const attachment = await createTeaImage(selectedDemlilik, sugarLabel);

            const finalEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('🎉 Çayınız Hazır!')
                .setDescription(`Afiyet olsun! Sizin için **${selectedDemlilik}** ve **${selectedSeker}** bir çay hazırladım.`)
                .setImage('attachment://cay_result.png')
                .setFooter({ text: 'Güle güle için!' });

            // Sonucu gönderme
            await i2.update({ 
                embeds: [finalEmbed], 
                files: [attachment], 
                components: [] 
            });

            collector2.stop(); // 2. aşama tamamlandı
            collector1.stop(); // 1. aşamayı da durdur
        });

        collector2.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('Grey')
                    .setDescription('İkinci aşamada zaman aşımına uğradınız. Çay siparişi iptal edildi.');
                await response.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    });

    collector1.on('end', async (collected, reason) => {
        // Eğer ilk aşamada süre dolarsa veya hiç seçim yapılmazsa
        if (reason === 'time' && collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('Grey')
                .setTitle('⏳ Süre Doldu')
                .setDescription('Demlilik seçimi yapılmadığı için çay siparişi iptal edildi.');
            
            // Tüm butonları devre dışı bırak
            const disabledRow = new ActionRowBuilder().addComponents(
                row1.components.map(b => ButtonBuilder.from(b).setDisabled(true))
            );

            await response.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['çay'],
    permLevel: 0
};

module.exports.help = {
    name: 'çayiç',
    description: 'Kullanıcının tercihine göre çay hazırlar ve görselini Canvas ile oluşturur.',
    usage: 'g!çayiç'
};
