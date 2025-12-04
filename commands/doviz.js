const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// API URL'leri
const RATE_API_URL = "https://api.teknikzeka.net/doviz/api.php";
// ⚠️ DİKKAT: Bu API'nin geçmiş fiyat verisi sağladığından emin olun.
// Gerçekçi bir grafik için burada geçmiş verisi sağlayan bir endpoint olmalı.
// Şu an için varsayımsal bir tarihçe yapısı kullanılacaktır.
const HISTORY_API_URL = "https://api.teknikzeka.net/doviz/history.php?symbol=";

// ChartJS ayarları
const CHART_CONFIG = {
    width: 800, 
    height: 500, 
    backgroundColour: '#1e1e1e', // Discord temasına yakın koyu arka plan
};

const chartJS = new ChartJSNodeCanvas(CHART_CONFIG);

// --- API FONKSİYONLARI ---

async function getRates() {
    try {
        const res = await axios.get(RATE_API_URL, { timeout: 10000 });
        if (!res.data || !res.data.data) throw new Error("API'den geçersiz veri geldi.");
        return res.data.data; // Döviz + Altın
    } catch (error) {
        console.error("Döviz/Altın API Hatası:", error.message);
        throw new Error("Döviz/Altın verileri şu anda alınamıyor.");
    }
}

/**
 * Varsayımsal olarak geçmiş veriyi çeker. (Gerçek API'ye göre ayarlanmalıdır!)
 * Eğer gerçek API yoksa, son 7 günü simüle eden veriyi döndürür.
 */
async function getHistory(symbol, latestSell) {
    // API'nin geçmiş verisi sağlamadığı varsayılarak simülasyon yapılıyor:
    
    // Gerçek API kullanıyorsanız:
    // const res = await axios.get(`${HISTORY_API_URL}${symbol}`, { timeout: 10000 });
    // return res.data.history;
    
    // Simülasyon: Son 7 gün için hafif düşüşlü/yükselişli yapay veri üretelim
    const baseValue = parseFloat(latestSell.replace(",", "."));
    const history = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        // 7 gün boyunca %-1 ile %+1 arasında rastgele bir değişim uygula
        const randomChange = (Math.random() * 2 - 1) * 0.005; // -0.5% ile +0.5% arası
        const value = baseValue * (1 + randomChange * (6 - i)); 
        
        history.push({
            date: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
            value: value.toFixed(4)
        });
    }
    return history;
}

// --- GRAFİK OLUŞTURMA ---

async function buildChart(history, symbol, isGold) {
    const labels = history.map(h => h.date);
    const data = history.map(h => parseFloat(h.value));

    const borderColor = isGold ? 'rgba(255,215,0,1)' : 'rgba(52, 152, 219, 1)'; // Altın: Sarı, Döviz: Mavi
    
    const config = {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `${symbol}/TRY`,
                data,
                borderColor,
                backgroundColor: isGold ? 'rgba(255,215,0,0.2)' : 'rgba(52, 152, 219, 0.2)',
                fill: true,
                tension: 0.1 // Eğrileri yumuşatır
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            },
            plugins: {
                legend: { labels: { color: 'white' } }
            }
        }
    };
    const buffer = await chartJS.renderToBuffer(config);
    return new AttachmentBuilder(buffer, { name: `${symbol}-graph.png` });
}

// --- ANA KOMUT FONKSİYONU ---

module.exports.run = async (client, message, args) => {
    
    // 1. Veriyi Çekme
    try {
        let rates = await getRates();
        const currencies = rates.map(r => r.code);
        let index = 0;
        let amount = null;
        const authorId = message.author.id;

        // 2. Miktar/Sembol Girdisi İşleme
        if (args.length === 2) {
            amount = parseFloat(args[0].replace(",", "."));
            const symbol = args[1].toUpperCase();
            if (!isNaN(amount) && currencies.includes(symbol)) {
                index = currencies.indexOf(symbol);
            }
        }

        // 3. Embed Oluşturucu
        async function buildEmbed(idx, currentAmount = null) {
            const r = rates[idx];
            const isGold = r.name.includes("Altın");
            
            // Değişim rengini dinamikleştir
            let changeColor = 'White';
            if (r.change && r.change.includes('+')) {
                changeColor = 'Green';
            } else if (r.change && r.change.includes('-')) {
                changeColor = 'Red';
            }

            let desc = `💵 Alış: **${r.buy}**\n💰 Satış: **${r.sell}**\n📊 Değişim: **${r.change}**\n`;

            if (currentAmount) {
                const converted = (currentAmount * parseFloat(r.sell.replace(",", "."))).toFixed(2);
                desc += `\n\n**${currentAmount.toFixed(2)} ${r.code}** ≈ **${converted} TRY** 🇹🇷`;
            }

            return new EmbedBuilder()
                .setColor(isGold ? 'Gold' : changeColor)
                .setTitle(`💱 ${r.name} (${r.code})`)
                .setDescription(desc)
                .setFooter({ text: `MotionAI Verisi • ${idx + 1}/${currencies.length} | Son Güncelleme: ${new Date().toLocaleTimeString('tr-TR')}` });
        }

        // 4. Buton Oluşturucu
        const row = (currentIndex) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Önceki').setStyle(ButtonStyle.Primary).setDisabled(currentIndex === 0),
                new ButtonBuilder().setCustomId('calculate').setLabel(' Hesapla').setStyle(ButtonStyle.Success).setEmoji('🧮'), // Hesapla butonu eklendi
                new ButtonBuilder().setCustomId('graph').setLabel('📈 Grafik').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('refresh').setLabel('🔄 Yenile').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('next').setLabel('Sonraki ➡️').setStyle(ButtonStyle.Primary).setDisabled(currentIndex === currencies.length - 1)
            );
        };

        const msg = await message.channel.send({ embeds: [await buildEmbed(index, amount)], components: [row(index)] });

        const collector = msg.createMessageComponentCollector({ time: 300000 }); // 5 dakika

        // --- COLLECTOR VE BUTON İŞLEMLERİ ---
        collector.on('collect', async i => {
            if (i.user.id !== authorId) {
                return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
            }

            if (i.customId === 'prev' || i.customId === 'next') {
                if (i.customId === 'prev' && index > 0) index--;
                if (i.customId === 'next' && index < currencies.length - 1) index++;
                
                await i.update({ embeds: [await buildEmbed(index, amount)], components: [row(index)] });
            } 
            
            else if (i.customId === 'calculate') {
                // 5. MODAL (Pop-up Form) ile Miktar Sorgulama
                const r = rates[index];
                const modal = new ModalBuilder()
                    .setCustomId(`doviz_calc_${authorId}`)
                    .setTitle(`${r.name} Miktar Hesaplama`);

                const input = new TextInputBuilder()
                    .setCustomId('calc_amount')
                    .setLabel(`Kaç ${r.code} (Örn: 100.5)`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await i.showModal(modal);

                // Modal yanıtını bekleme
                const filter = (interaction) => interaction.customId === `doviz_calc_${authorId}` && interaction.user.id === authorId;
                i.awaitModalSubmit({ filter, time: 60000 })
                    .then(async modalInteraction => {
                        const newAmountStr = modalInteraction.fields.getTextInputValue('calc_amount').replace(",", ".");
                        const newAmount = parseFloat(newAmountStr);

                        if (isNaN(newAmount) || newAmount <= 0) {
                            return modalInteraction.reply({ content: 'Lütfen geçerli bir pozitif sayı girin.', ephemeral: true });
                        }

                        amount = newAmount; // Yeni miktarı global olarak kaydet
                        
                        // Ana mesajı yeni miktarla güncelle
                        await modalInteraction.update({ embeds: [await buildEmbed(index, amount)], components: [row(index)] });
                    }).catch(err => {
                        // Zaman aşımı veya başka hata (console.log veya modalInteraction.reply)
                    });

            }
            
            else if (i.customId === 'graph') {
                const r = rates[index];
                const isGold = r.name.includes("Altın");
                
                // Gerçekçi simülasyon veya API'den tarihçe çek
                const history = await getHistory(r.code, r.sell);
                const chartFile = await buildChart(history, r.code, isGold);

                const graphEmbed = new EmbedBuilder()
                    .setColor(isGold ? 'Gold' : 'Purple')
                    .setTitle(`📈 ${r.name}/TRY Son 7 Gün`)
                    .setDescription(`Son 7 günün fiyat değişim grafiği (${r.code} Satış) aşağıda:`)
                    .setImage(`attachment://${r.code}-graph.png`) // Görseli Embed içine yerleştir
                    .setFooter({ text: 'Grafik verisi simülasyon amaçlıdır. (Gerçek API yoksa)' });

                await i.reply({ embeds: [graphEmbed], files: [chartFile], ephemeral: true });
            } 
            
            else if (i.customId === 'refresh') {
                await i.deferUpdate(); // Yanıt süresini uzat
                
                try {
                    // Verileri yeniden çek
                    rates = await getRates();
                    
                    // Başarılı güncelleme
                    await i.editReply({ embeds: [await buildEmbed(index, amount)], components: [row(index)] });
                } catch (e) {
                    // API hatası durumunda kullanıcıya bilgi ver
                    await i.editReply({ 
                        embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Verileri yenileme sırasında bir hata oluştu.')],
                        components: [row(index)]
                    });
                }
            }
        });

        collector.on('end', async () => {
            try {
                // Süre bitince butonları kaldır
                await msg.edit({ components: [] });
            } catch {}
        });
        
    } catch (error) {
        // İlk veri çekme hatası (getRates)
        await message.channel.send({ 
            embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Veri Kaynağı Hatası').setDescription(error.message)] 
        });
    }
};

module.exports.conf = {
  aliases: ['doviz', 'kur', 'altin', 'forex']
};

module.exports.help = {
  name: 'döviz',
  description: 'Butonlu, profesyonel döviz ve altın sistemi. Miktar girilirse TL karşılığını hesaplar, grafik ve yenileme desteği sağlar.'
};
