const axios = require('axios');
const cheerio = require('cheerio');
const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

// Ayarlar
const DATA_URL = 'http://www.koeri.boun.edu.tr/scripts/lst0.asp';
const perPage = 7; // Daha temiz bir görünüm için 7 idealdir

// Cache Yönetimi
let cachedDepremler = [];
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 saniye

// --- YARDIMCI FONKSİYONLAR ---

function getMagnitudeStyle(magnitude) {
    const mag = parseFloat(magnitude);
    if (isNaN(mag)) return { color: 0x808080, emoji: '⚪', title: 'Veri Yok', bar: '⬜⬜⬜⬜⬜' };
    if (mag >= 6.0) return { color: 0x000000, emoji: '🚨', title: 'KAYTASTROFİK DEPREM', bar: '⬛⬛⬛⬛⬛' };
    if (mag >= 5.0) return { color: 0xff0000, emoji: '🔴', title: 'ŞİDDETLİ DEPREM', bar: '🟥🟥🟥🟥🟥' };
    if (mag >= 4.0) return { color: 0xffa500, emoji: '🟠', title: 'ORTA ŞİDDETLİ DEPREM', bar: '🟧🟧🟧🟧⬜' };
    if (mag >= 3.0) return { color: 0xffff00, emoji: '🟡', title: 'HAFİF ŞİDDETLİ DEPREM', bar: '🟨🟨🟨⬜⬜' };
    return { color: 0x00ff00, emoji: '🟢', title: 'DÜŞÜK ŞİDDETLİ DEPREM', bar: '🟩⬜⬜⬜⬜' };
}

async function fetchDepremler() {
    if (Date.now() - lastFetchTime < CACHE_DURATION && cachedDepremler.length > 0) {
        return cachedDepremler;
    }
    
    try {
        const { data } = await axios.get(DATA_URL, { timeout: 10000 });
        const $ = cheerio.load(data);
        const text = $('pre').text();
        const rows = text.split('\n').slice(6);

        const depremler = rows.map(row => {
            const parts = row.trim().split(/\s+/);
            if (parts.length < 10) return null;
            return {
                tarih: parts[0],
                saat: parts[1],
                enlem: parts[2],
                boylam: parts[3],
                derinlik: parts[4],
                buyukluk: parts[6],
                yer: parts[8],
                sehir: parts[9] ? parts[9].replace(/[()]/g, '') : ""
            };
        }).filter(d => d !== null);

        cachedDepremler = depremler;
        lastFetchTime = Date.now();
        return depremler;
    } catch (e) {
        console.error("Deprem çekme hatası:", e);
        return cachedDepremler; // Hata durumunda eskisini döndür
    }
}

const generateEmbed = (list, page, filter = null) => {
    const maxPage = Math.ceil(list.length / perPage) || 1;
    const current = list.slice(page * perPage, (page + 1) * perPage);
    const topMag = list.length > 0 ? Math.max(...list.map(d => parseFloat(d.buyukluk))) : 0;
    const style = getMagnitudeStyle(topMag);

    const embed = new EmbedBuilder()
        .setColor(style.color)
        .setTitle(`${style.emoji} ${filter ? `Filtre: ${filter}` : 'Son Depremler (Türkiye)'}`)
        .setThumbnail('https://upload.wikimedia.org/wikipedia/tr/b/bb/Kandilli_Rasathanesi_logosu.png')
        .setFooter({ text: `Sayfa ${page + 1}/${maxPage} • Grave Deprem Sistemi`, iconURL: 'https://cdn.discordapp.com/emojis/1440677432976867448.gif' })
        .setTimestamp();

    if (list.length === 0) {
        embed.setDescription("❌ Belirlediğiniz kriterlere uygun deprem kaydı bulunamadı.");
        return embed;
    }

    const description = current.map(d => {
        const s = getMagnitudeStyle(d.buyukluk);
        const yer = `${d.yer} ${d.sehir ? `(${d.sehir})` : ''}`.replace(/İ/g, 'i').toLowerCase().replace(/(^\w|\s\w)/g, l => l.toUpperCase());
        const maps = `https://www.google.com/maps?q=${d.enlem},${d.boylam}`;
        
        return `${s.emoji} **${d.buyukluk}** | ${s.bar}\n` +
               `📍 **[${yer}](${maps})**\n` +
               `🕒 \`${d.tarih} ${d.saat}\` | ↕️ \`${d.derinlik} km\``;
    }).join('\n\n');

    embed.setDescription(description);
    
    if (page === 0 && !filter) {
        embed.addFields({ name: '📊 İstatistik', value: `Son verilerde en büyük sarsıntı: **${topMag}**`, inline: false });
    }

    return embed;
};

const generateButtons = (page, totalLen) => {
    const maxPage = Math.ceil(totalLen / perPage);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dep_prev').setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('dep_filter').setLabel('🔍 Şehir Filtrele').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('dep_refresh').setLabel('🔄 Yenile').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('dep_next').setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page + 1 >= maxPage)
    );
};

// --- KOMUT ÇALIŞTIRMA ---

module.exports.run = async (client, message, args) => {
    const loading = new EmbedBuilder().setColor('Yellow').setDescription('⏳ Veriler Kandilli Rasathanesi\'nden alınıyor...');
    const msg = await message.channel.send({ embeds: [loading] });

    let allDepremler = await fetchDepremler();
    let currentList = allDepremler;
    let page = 0;
    let filter = null;

    const updateMessage = async (interaction = null) => {
        const embed = generateEmbed(currentList, page, filter);
        const row = generateButtons(page, currentList.length);
        
        if (interaction) {
            await interaction.update({ embeds: [embed], components: [row] });
        } else {
            await msg.edit({ embeds: [embed], components: [row] });
        }
    };

    await updateMessage();

    const collector = msg.createMessageComponentCollector({ time: 600000 });

    collector.on('collect', async (i) => {
        if (i.user.id !== message.author.id) return i.reply({ content: '❌ Bu butonları sadece komutu yazan kullanabilir.', ephemeral: true });

        if (i.customId === 'dep_prev') {
            page--;
            await updateMessage(i);
        } else if (i.customId === 'dep_next') {
            page++;
            await updateMessage(i);
        } else if (i.customId === 'dep_refresh') {
            allDepremler = await fetchDepremler();
            currentList = allDepremler;
            filter = null;
            page = 0;
            await updateMessage(i);
        } else if (i.customId === 'dep_filter') {
            const modal = new ModalBuilder().setCustomId('m_dep_filter').setTitle('Deprem Filtrele');
            const input = new TextInputBuilder()
                .setCustomId('f_input')
                .setLabel('Şehir veya Bölge Adı')
                .setPlaceholder('Örn: İzmir veya Akdeniz')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await i.showModal(modal);

            // Modal Yanıtı Bekle
            const submitted = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
            if (submitted) {
                const val = submitted.fields.getTextInputValue('f_input').toUpperCase('tr-TR');
                filter = val;
                currentList = allDepremler.filter(d => d.yer.includes(val) || d.sehir.includes(val));
                page = 0;
                const embed = generateEmbed(currentList, page, filter);
                const row = generateButtons(page, currentList.length);
                await submitted.update({ embeds: [embed], components: [row] });
            }
        }
    });

    collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = {
    aliases: ['depremler', 'earthquake', 'sondeprem']
};

module.exports.help = {
    name: 'deprem'
};
