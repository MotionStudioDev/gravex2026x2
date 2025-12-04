const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Veri kaynağı: Boğaziçi Üniversitesi Kandilli Rasathanesi
const DATA_URL = 'http://www.koeri.boun.edu.tr/scripts/lst0.asp';

// Yardımcı fonksiyon: Deprem Büyüklüğüne göre renk ve emoji belirleme
function getMagnitudeStyle(magnitude) {
    const mag = parseFloat(magnitude);
    if (isNaN(mag)) return { color: '#808080', emoji: '⚪', title: 'Son Depremler' };

    if (mag >= 5.0) return { color: '#e74c3c', emoji: '🔴', title: '⚠️ BÜYÜK DEPREM UYARISI' }; // Kırmızı
    if (mag >= 4.0) return { color: '#f39c12', emoji: '🟠', title: 'Önemli Depremler' }; // Turuncu
    if (mag >= 3.0) return { color: '#f1c40f', emoji: '🟡', title: 'Son Depremler' }; // Sarı
    if (mag >= 1.0) return { color: '#2ecc71', emoji: '🟢', title: 'Son Depremler' }; // Yeşil
    return { color: '#3498db', emoji: '🔵', title: 'Son Depremler' }; // Mavi (Çok küçük)
}

module.exports.run = async (client, message, args) => {
    
    class Deprem {
        constructor(tarih, saat, enlem, boylam, derinlik, buyukluk, yer, sehir) {
            this.tarih = tarih;
            this.saat = saat;
            this.enlem = enlem;
            this.boylam = boylam;
            this.derinlik = derinlik;
            this.buyukluk = buyukluk;
            this.yer = yer;
            this.sehir = sehir;
        }
    }

    async function getirDepremler() {
        try {
            const response = await axios.get(DATA_URL, { timeout: 10000 }); // 10 saniye timeout ekleyelim
            const $ = cheerio.load(response.data);

            const text = $('pre').text();
            let result = text.split('\n');
            result = result.splice(6); // İlk 6 satırı atla

            const depremler = [];
            result.forEach(element => {
                // Birden fazla boşluk olabileceği için regex ile ayırma
                const depremString = element.trim().split(/\s+/).filter(e => e.length > 0);
                if (depremString.length < 10) return;

                // [tarih, saat, enlem, boylam, derinlik, MD, ML, Mw, yer, sehir]
                // Koeri formatına göre ayıklama
                const [tarih, saat, enlem, boylam, derinlik, , buyukluk, , yer, sehir] = depremString;
                
                // Sadece ML (Yerel Büyüklük) büyüklüğünü kullanalım, genellikle en anlamlı olanı budur
                const deprem = new Deprem(tarih, saat, enlem, boylam, derinlik, buyukluk, yer, sehir);
                depremler.push(deprem);
            });

            // En son depremin büyüklüğüne göre renk/başlık stilini belirle
            const mainStyle = depremler.length > 0 ? getMagnitudeStyle(depremler[0].buyukluk) : getMagnitudeStyle(0);
            return { depremler, mainStyle };
            
        } catch (error) {
            console.error('Veri çekme hatası:', error.message);
            // Hata durumunda boş dizi ve varsayılan stil döndür
            return { depremler: [], mainStyle: getMagnitudeStyle(0) };
        }
    }

    // Yükleniyor Mesajı
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('<a:yukle:1440677432976867448> MotionAPI verileri çekiliyor...');
    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    let { depremler, mainStyle } = await getirDepremler();
    if (depremler.length === 0) {
        return msg.edit({ 
            embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Deprem Verisi Bulunamadı').setDescription('Veri kaynağına bağlanılamadı veya veri boş döndü.')] 
        }).catch(() => {});
    }

    // Sayfalama ayarları
    const perPage = 10;
    let page = 0;
    const maxPages = Math.ceil(depremler.length / perPage);

    const generateEmbed = (page) => {
        const slice = depremler.slice(page * perPage, (page + 1) * perPage);
        const style = getMagnitudeStyle(depremler[page * perPage].buyukluk); // Sayfanın ilk depreminin stilini al

        return new EmbedBuilder()
            .setColor(style.color)
            .setTitle(`${mainStyle.emoji} ${mainStyle.title} (Sayfa ${page + 1}/${maxPages})`)
            .setTimestamp()
            .setFooter({ 
                text: `Motion Deprem Verisi • Toplam: ${depremler.length} kayıt • Son güncelleme: ${new Date().toLocaleTimeString('tr-TR')}` 
            })
            .setDescription(
                slice.map(d => {
                    const { emoji } = getMagnitudeStyle(d.buyukluk);
                    const yerAdi = d.yer.trim() + (d.sehir.trim() !== '' ? ` (${d.sehir.trim()})` : '');
                    
                    return `${emoji} **${d.buyukluk}** | **Derinlik:** ${d.derinlik} km\n` +
                           `🕒 **${d.tarih}** ${d.saat} | 📍 **Yer:** ${yerAdi}\n` +
                           `[Haritada Görün](https://www.google.com/maps/search/?api=1&query=${d.enlem},${d.boylam})`;
                }).join('\n\n')
            );
    };

    const generateRow = (page, maxPages) => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('⬅️ Geri')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0), // İlk sayfadaysa devre dışı
            new ButtonBuilder()
                .setCustomId('refresh')
                .setLabel('🔄 Yenile')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('İleri ➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page + 1 >= maxPages) // Son sayfadaysa devre dışı
        );
    };

    // İlk gönderim
    await msg.edit({ embeds: [generateEmbed(page)], components: [generateRow(page, maxPages)] });

    const collector = msg.createMessageComponentCollector({ time: 180_000 }); // 3 dakika yapalım

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
            return interaction.reply({ content: 'Bu butonları sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
        }

        let isRefreshed = false;
        
        if (interaction.customId === 'prev') {
            page = page > 0 ? page - 1 : 0;
        } else if (interaction.customId === 'next') {
            if (page + 1 < maxPages) page++;
        } else if (interaction.customId === 'refresh') {
            // Yenile → verileri tekrar çek
            const freshData = await getirDepremler();
            depremler = freshData.depremler;
            mainStyle = freshData.mainStyle;
            page = 0; // Başa dön
            isRefreshed = true;
        }

        // maxPages'i güncelle
        const newMaxPages = Math.ceil(depremler.length / perPage);
        const newPage = isRefreshed ? 0 : page; 

        await interaction.update({ 
            embeds: [generateEmbed(newPage)], 
            components: [generateRow(newPage, newMaxPages)] 
        });
    });

    collector.on('end', () => {
        // Süre bitince butonları kaldır
        msg.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = {
    aliases: ['deprem-son', 'earthquake']
};

module.exports.help = {
    name: 'deprem',
    description: 'Son depremleri Kandilli Rasathanesi verileriyle sayfalı ve detaylı gösterir.'
};
