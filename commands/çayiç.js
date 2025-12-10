const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

// Sabitler
const TIME_LIMIT = 15000; // 15 saniye

// --------------------------------------------------------------------------------------
// CANVAS FONKSİYONU: Çay Görseli Oluşturma (GELİŞTİRİLMİŞ VERSİYON)
// --------------------------------------------------------------------------------------
async function createTeaImage(color, sugar) {
    const width = 600; // Daha büyük tuval
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // --- GELİŞMİŞ ARKA PLAN ---
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#E8F4F8');
    gradient.addColorStop(1, '#D1E7F5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Fincan tabanı (gölge)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.ellipse(width / 2, 490, 180, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- FINCAN GÖVDESİ ---
    const cupBottomY = 450;
    const cupTopY = 200;
    const cupWidth = 320;
    const cupX = (width - cupWidth) / 2;

    // Fincan gövdesi (dış)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 6;
    
    ctx.beginPath();
    ctx.moveTo(cupX + 40, cupTopY);
    ctx.bezierCurveTo(cupX - 10, cupTopY + 50, cupX - 10, cupBottomY - 30, cupX + 20, cupBottomY);
    ctx.bezierCurveTo(cupX + cupWidth - 20, cupBottomY, cupX + cupWidth + 10, cupBottomY - 30, cupX + cupWidth - 40, cupTopY);
    ctx.bezierCurveTo(cupX + cupWidth - 80, cupTopY - 20, cupX + 80, cupTopY - 20, cupX + 40, cupTopY);
    ctx.closePath();
    ctx.stroke();
    
    // Fincan içi (gradyan)
    const cupGradient = ctx.createLinearGradient(0, cupTopY, 0, cupBottomY);
    cupGradient.addColorStop(0, '#FAFAFA');
    cupGradient.addColorStop(1, '#F0F0F0');
    ctx.fillStyle = cupGradient;
    ctx.fill();

    // Fincan içi detay (kenar)
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cupX + 50, cupTopY + 5);
    ctx.lineTo(cupX + cupWidth - 50, cupTopY + 5);
    ctx.stroke();

    // --- FINCAN KULPU ---
    ctx.beginPath();
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#DDDDDD';
    ctx.arc(cupX + cupWidth + 70, cupTopY + 150, 75, 0.3 * Math.PI, 1.7 * Math.PI);
    ctx.stroke();

    // Kulpu bağlantı noktası
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cupX + cupWidth - 10, cupTopY + 80, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 3;
    ctx.stroke();

    // --- ÇAY SIVISI ---
    let teaColor = color === 'demli' ? '#5C3317' : '#B87333';
    const liquidTopY = cupTopY + 40;
    const liquidBottomY = cupBottomY - 25;
    
    // Çay gövdesi
    ctx.fillStyle = teaColor;
    ctx.beginPath();
    ctx.moveTo(cupX + 50, liquidTopY);
    ctx.bezierCurveTo(cupX + 20, liquidTopY + 100, cupX + 20, liquidBottomY - 50, cupX + 40, liquidBottomY);
    ctx.bezierCurveTo(cupX + cupWidth - 40, liquidBottomY, cupX + cupWidth - 20, liquidBottomY - 50, cupX + cupWidth - 50, liquidTopY);
    ctx.closePath();
    ctx.fill();
    
    // Çay yüzeyi parlaması
    const surfaceGradient = ctx.createLinearGradient(0, liquidTopY, 0, liquidTopY + 30);
    surfaceGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    surfaceGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = surfaceGradient;
    ctx.fill();
    
    // Yüzey çizgisi
    ctx.strokeStyle = color === 'demli' ? '#3D2411' : '#8B5A2B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cupX + 50, liquidTopY);
    ctx.lineTo(cupX + cupWidth - 50, liquidTopY);
    ctx.stroke();

    // Çay içi hafif dalgalanma efekti
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const waveY = liquidTopY + 80 + (i * 40);
        ctx.beginPath();
        ctx.moveTo(cupX + 60, waveY);
        ctx.bezierCurveTo(
            cupX + cupWidth / 3, waveY + 5,
            cupX + (cupWidth * 2) / 3, waveY - 5,
            cupX + cupWidth - 60, waveY
        );
        ctx.stroke();
    }

    // --- BUHAR EFEKTLERİ ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 3 farklı buhar çizgisi
    const steamPaths = [
        { startX: -50, curve1: -80, curve2: -60, endX: -40 },
        { startX: 0, curve1: -100, curve2: -80, endX: 0 },
        { startX: 50, curve1: -60, curve2: -100, endX: 40 }
    ];
    
    steamPaths.forEach(path => {
        ctx.beginPath();
        ctx.moveTo(cupX + cupWidth / 2 + path.startX, cupTopY - 30);
        ctx.bezierCurveTo(
            cupX + cupWidth / 2 + path.curve1, cupTopY - 120,
            cupX + cupWidth / 2 + path.curve2, cupTopY - 200,
            cupX + cupWidth / 2 + path.endX, cupTopY - 280
        );
        ctx.stroke();
    });

    // --- METİN VE BAŞLIKLAR ---
    // Başlık gölgesi
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    // Ana başlık (Şeker durumu)
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 48px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(sugar, width / 2, 40);
    
    // Alt başlık (Çay tipi)
    ctx.fillStyle = teaColor;
    ctx.font = 'italic 36px "Arial", sans-serif';
    const teaType = color === 'demli' ? 'Demli Çay' : 'Açık Çay';
    ctx.fillText(teaType, width / 2, 100);
    
    // Gölgeleri kaldır
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Alt bilgi
    ctx.fillStyle = '#7F8C8D';
    ctx.font = '20px "Arial", sans-serif';
    ctx.fillText('Afiyet olsun!', width / 2, height - 40);

    // --- FINCAN GÖLGESİ (son katman) ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.beginPath();
    ctx.ellipse(width / 2, cupBottomY + 10, 140, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'cay_result.png' });
}

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
        await i1.deferUpdate();

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
            .setDescription('Şimdi de çayınızı **şekerli** mi yoksa **şekersiz** mi istersiniz?')
            .setFooter({ text: `Seçim için ${TIME_LIMIT / 1000} saniyeniz var.` });

        await response.edit({ embeds: [stage2Embed], components: [row2] });

        // 2. Aşama Kolektörü Filtresi
        const filter2 = (i) => i.user.id === message.author.id && (i.customId === 'tea_sekerli' || i.customId === 'tea_sekersiz');

        const collector2 = response.createMessageComponentCollector({ 
            filter: filter2, 
            time: TIME_LIMIT, 
            max: 1, 
            componentType: ComponentType.Button 
        });

        collector2.on('collect', async i2 => {
            const selectedSeker = i2.customId.split('_')[1];
            
            // Canvas ile görseli oluştur
            const sugarLabel = selectedSeker === 'sekerli' ? 'Şekerli Çay' : 'Şekersiz Çay';
            const attachment = await createTeaImage(selectedDemlilik, sugarLabel);

            const finalEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('🎉 Çayınız Hazır!')
                .setDescription(`Afiyet olsun! Sizin için **${selectedDemlilik}** ve **${selectedSeker}** bir çay hazırladım.`)
                .setImage('attachment://cay_result.png')
                .setFooter({ text: 'GraveBOT Çay Servisi • Güle güle için!' });

            await i2.update({ 
                embeds: [finalEmbed], 
                files: [attachment], 
                components: [] 
            });

            collector2.stop();
            collector1.stop();
        });

        collector2.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('Grey')
                    .setTitle('⏳ Süre Doldu')
                    .setDescription('Şeker seçimi yapılmadığı için çay siparişi iptal edildi.');
                    
                // Butonları devre dışı bırak
                const disabledRow2 = new ActionRowBuilder().addComponents(
                    row2.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                );
                
                await response.edit({ 
                    embeds: [timeoutEmbed], 
                    components: [disabledRow2] 
                }).catch(() => {});
            }
        });
    });

    collector1.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('Grey')
                .setTitle('⏳ Süre Doldu')
                .setDescription('Demlilik seçimi yapılmadığı için çay siparişi iptal edildi.');
            
            // Butonları devre dışı bırak
            const disabledRow1 = new ActionRowBuilder().addComponents(
                row1.components.map(b => ButtonBuilder.from(b).setDisabled(true))
            );

            await response.edit({ 
                embeds: [timeoutEmbed], 
                components: [disabledRow1] 
            }).catch(() => {});
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
