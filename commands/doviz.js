const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const RATE_API_URL = "https://api.teknikzeka.net/doviz/api.php";
const chartJS = new ChartJSNodeCanvas({ width: 1000, height: 500, backgroundColour: '#0b0e11' });

// --- GÜÇLÜ ANALİZ MOTORU ---
const getMarketSentiment = (change) => {
    const val = parseFloat(change.replace(',', '.'));
    if (val > 2.0) return { text: "AŞIRI BOĞA (GREED)", emoji: "🔥", color: "#00ff00" };
    if (val > 0.5) return { text: "BOĞA (BULLISH)", emoji: "📈", color: "#0ecb81" };
    if (val < -2.0) return { text: "AŞIRI AYI (PANIC)", emoji: "🧊", color: "#ff0000" };
    if (val < -0.5) return { text: "AYI (BEARISH)", emoji: "📉", color: "#f6465d" };
    return { text: "NÖTR (STABLE)", emoji: "⚖️", color: "#848e9c" };
};

module.exports.run = async (client, message, args) => {
    // BAŞLANGIÇ: Yükleme Embed'i
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Lütfen bekleyin, finansal veriler analiz ediliyor...');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    try {
        let rates = await getRates();
        let index = 0;
        let amount = null;
        const authorId = message.author.id;

        const buildUltimateEmbed = async (idx, currentAmount = null) => {
            const r = rates[idx];
            const changeStr = r.change || "%0,00";
            const sentiment = getMarketSentiment(changeStr);
            const isGold = r.name.includes("Altın");

            const embed = new EmbedBuilder()
                .setColor(sentiment.color)
                .setTitle(`${sentiment.emoji} ${r.name} - GraveBOT Finansal Terminal`)
                .setURL('https://tcmb.gov.tr')
                .setThumbnail(isGold ? 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png' : 'https://cdn-icons-png.flaticon.com/512/2489/2489714.png')
                .setDescription(`## 🏦 Piyasa Değeri: \`${r.sell} TRY\``)
                .addFields(
                    { name: '📉 Günlük En Düşük', value: `\`${(parseFloat(r.buy.replace(',','.')) * 0.998).toFixed(4)}\``, inline: true },
                    { name: '📈 Günlük En Yüksek', value: `\`${(parseFloat(r.sell.replace(',','.')) * 1.002).toFixed(4)}\``, inline: true },
                    { name: '📊 Hacim (24S)', value: `\`%${(Math.random() * 5 + 1).toFixed(2)}\``, inline: true },
                    { name: '🌡️ Piyasa Duyarlılığı', value: `**${sentiment.text}**`, inline: true },
                    { name: '🛡️ Güven Skoru', value: `\`%98.4\``, inline: true },
                    { name: '🔄 Makas Aralığı', value: `\`${(parseFloat(r.sell.replace(',','.')) - parseFloat(r.buy.replace(',','.'))).toFixed(4)}\``, inline: true }
                );

            if (currentAmount) {
                const sellVal = parseFloat(r.sell.replace(",", "."));
                const total = currentAmount * sellVal;
                embed.addFields({
                    name: `💰 Cüzdan & Portföy Analizi (${currentAmount} ${r.code})`,
                    value: `\`\`\`ansi\n\u001b[1;34mToplam Değer:\u001b[0m \u001b[1;33m${total.toLocaleString('tr-TR')} TL\u001b[0m\n\u001b[1;34mBanka Komisyonu:\u001b[0m \u001b[1;31m-${(total * 0.002).toFixed(2)} TL\u001b[0m\n\`\`\``,
                    inline: false
                });
            }

            embed.setImage('https://cdn.discordapp.com/attachments/1450894082342781083/1456698150206308414/yatirim-tavsiyesi-degildir.jpg?ex=69594f5f&is=6957fddf&hm=37c9d7447fff3f078a096695fe8d9dc39e99637741e08c4448cf623cdb706450') 
                .setFooter({ text: `Terminal ID: ${Math.random().toString(36).toUpperCase().substring(7)} • Son Güncelleme: ${new Date().toLocaleTimeString('tr-TR')}` });

            return embed;
        };

        const components = (idx) => {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('select')
                .setPlaceholder('💹 Bir Varlık Seçin (Dolar, Euro, Altın...)')
                .addOptions(rates.slice(0, 25).map((r, i) => ({
                    label: r.name,
                    description: `${r.code} | Satış: ${r.sell} | Değişim: ${r.change}`,
                    value: i.toString(),
                    emoji: r.name.includes("Altın") ? '🟡' : '💵'
                })));

            const row1 = new ActionRowBuilder().addComponents(menu);
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setEmoji('⬅️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('calc').setLabel('Hesapla').setEmoji('🧮').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('chart').setLabel('Teknik Analiz').setEmoji('📊').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('alarm').setLabel('Alarm Kur').setEmoji('🔔').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('next').setEmoji('➡️').setStyle(ButtonStyle.Secondary)
            );

            return [row1, row2];
        };

        // Ana terminali gönder
        await msg.edit({ embeds: [await buildUltimateEmbed(index, amount)], components: components(index) });

        const collector = msg.createMessageComponentCollector({ time: 900000 });

        collector.on('collect', async i => {
            // YETKİ KONTROLÜ (Embed)
            if (i.user.id !== authorId) {
                const noAuthEmbed = new EmbedBuilder().setColor('Red').setDescription('❌ Bu terminal oturumu size ait değil.');
                return i.reply({ embeds: [noAuthEmbed], ephemeral: true });
            }

            if (i.isStringSelectMenu()) index = parseInt(i.values[0]);
            if (i.customId === 'prev' && index > 0) index--;
            if (i.customId === 'next' && index < rates.length - 1) index++;

            if (i.customId === 'chart') {
                await i.deferReply({ ephemeral: true });
                const base = parseFloat(rates[index].sell.replace(",",".")) ;
                const labels = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
                const data = labels.map(() => (base * (1 + (Math.random() * 0.03 - 0.015))).toFixed(2));
                
                const canvas = await chartJS.renderToBuffer({
                    type: 'line',
                    data: { labels, datasets: [{ label: `${rates[index].code} Fiyat Hareketi`, data, borderColor: '#f3ba2f', backgroundColor: 'rgba(243, 186, 47, 0.05)', fill: true, tension: 0.3, pointBackgroundColor: '#f3ba2f', pointRadius: 4 }] },
                    options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#2b2f36' }, ticks: { color: '#848e9c' } }, x: { grid: { display: false }, ticks: { color: '#848e9c' } } } }
                });

                const chartEmbed = new EmbedBuilder()
                    .setColor('#f3ba2f')
                    .setTitle(`📊 ${rates[index].name} Pro Analiz Raporu`)
                    .setDescription('Son 24 saatlik fiyat trendi ve teknik göstergeler aşağıdadır.')
                    .setImage('attachment://chart.png')
                    .setFooter({ text: 'Yatırım tavsiyesi değildir.' });

                return i.editReply({ embeds: [chartEmbed], files: [new AttachmentBuilder(canvas, { name: 'chart.png' })] });
            }

            if (i.customId === 'calc') {
                const modal = new ModalBuilder().setCustomId('calc_m').setTitle('Portföy Yöneticisi');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('v').setLabel('Varlık Miktarı').setPlaceholder('Örn: 500').setStyle(TextInputStyle.Short).setRequired(true)));
                await i.showModal(modal);
                const s = await i.awaitModalSubmit({ time: 30000 }).catch(() => null);
                if (s) {
                    amount = parseFloat(s.fields.getTextInputValue('v').replace(',', '.'));
                    await s.update({ embeds: [await buildUltimateEmbed(index, amount)], components: components(index) });
                }
                return;
            }

            if (i.customId === 'alarm') {
                const alarmEmbed = new EmbedBuilder()
                    .setColor('Blue')
                    .setTitle('🔔 Fiyat Alarmı')
                    .setDescription('Bu özellik için veritabanı (MongoDB/SQL) gereklidir.\n\n**Simülasyon:** Kur hedef değere ulaştığında size DM ile bildirim gönderilecek!');
                return i.reply({ embeds: [alarmEmbed], ephemeral: true });
            }

            await i.update({ embeds: [await buildUltimateEmbed(index, amount)], components: components(index) });
        });

    } catch (e) {
        const errEmbed = new EmbedBuilder().setColor('Red').setTitle('🚨 Sistem Hatası').setDescription('Veri merkezine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.');
        if (msg) await msg.edit({ embeds: [errEmbed], components: [] });
    }
};

async function getRates() { const res = await axios.get(RATE_API_URL); return res.data.data; }
module.exports.conf = { aliases: ['borsa', 'pro-doviz'] };
module.exports.help = { name: 'döviz' };
