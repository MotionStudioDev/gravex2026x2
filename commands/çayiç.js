const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

// Sabitler
const TIME_LIMIT = 15000; // 15 saniye

// --------------------------------------------------------------------------------------
// CANVAS FONKSİYONU: Çay Görseli Oluşturma
// --------------------------------------------------------------------------------------
async function createTeaImage(color, sugar) {
    const width = 400;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Arkaplan
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // Fincan Rengi
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(50, 150, 300, 200, 20); // Bardak gövdesi
    ctx.stroke();
    ctx.fill();

    // Çay Rengi (Demlilik)
    let teaColor = color === 'demli' ? '#652a0e' : '#a0522d'; // Demli: Koyu kahve, Açık: Açık kahve
    ctx.fillStyle = teaColor;
    ctx.beginPath();
    ctx.roundRect(55, 155, 290, 190, 15); // Çay sıvısı
    ctx.fill();

    // Buhar efekti (Basit)
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 140);
    ctx.bezierCurveTo(180, 100, 220, 100, 250, 140);
    ctx.stroke();

    // Şeker Durumu Yazısı
    ctx.fillStyle = '#333333';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(sugar, width / 2, 80);

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
            const attachment = await createTeaImage(selectedDemlilik, selectedSeker === 'sekerli' ? 'Şekerli' : 'Şekersiz');

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
        });

        collector2.on('end', async (collected, reason) => {
            if (reason === 'time') {
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
