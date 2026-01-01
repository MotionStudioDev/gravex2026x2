const axios = require('axios');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip'); 
const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder,
    AttachmentBuilder 
} = require('discord.js');

const DATA_URL = 'http://www.koeri.boun.edu.tr/scripts/lst0.asp';
const perPage = 3;

const getRiskAnalysis = (mag, depth) => {
    const m = parseFloat(mag);
    if (m >= 7.0) return { label: '☣️ FELAKET DÜZEYİ', color: '#8b0000', ansi: '\u001b[1;31m', threat: '██████████ %100' };
    if (m >= 5.5) return { label: '🚨 YIKICI RİSK', color: '#ff0000', ansi: '\u001b[1;31m', threat: '████████░░ %80' };
    if (m >= 4.5) return { label: '⚠️ YÜKSEK SARSINTI', color: '#ff8c00', ansi: '\u001b[1;33m', threat: '██████░░░░ %60' };
    if (m >= 3.5) return { label: '🟡 HİSSEDİLEBİLİR', color: '#ffd700', ansi: '\u001b[1;33m', threat: '████░░░░░░ %40' };
    return { label: '🟢 MİKRO AKTİVİTE', color: '#00ff00', ansi: '\u001b[1;32m', threat: '██░░░░░░░░ %15' };
};

async function fetchData() {
    try {
        const { data } = await axios.get(DATA_URL, { timeout: 10000 });
        const $ = cheerio.load(data);
        const rows = $('pre').text().split('\n').slice(6);
        return rows.map(r => {
            const p = r.trim().split(/\s+/);
            if (p.length < 10) return null;
            return {
                d: p[0], t: p[1], lat: p[2], lon: p[3], dep: p[4], mag: parseFloat(p[6]),
                loc: `${p[8]} ${p[9] ? p[9].replace(/[()]/g, '') : ""}`.replace(/İ/g, 'i').toLowerCase().replace(/(^\w|\s\w)/g, l => l.toUpperCase())
            };
        }).filter(x => x !== null);
    } catch (e) { return null; }
}

const buildUltraEmbed = (list, page, filter, minM) => {
    // Harf duyarlılığı fixlendi: Hem liste hem filtre küçük harfe çevrilip karşılaştırılıyor
    const filtered = list.filter(x => {
        const matchesMag = x.mag >= minM;
        const matchesLoc = filter === "Tümü" || x.loc.toLocaleLowerCase('tr-TR').includes(filter.toLocaleLowerCase('tr-TR'));
        return matchesMag && matchesLoc;
    });

    const total = filtered.length;
    const maxP = Math.ceil(total / perPage) || 1;
    const current = filtered.slice(page * perPage, (page + 1) * perPage);
    const maxMag = total > 0 ? Math.max(...filtered.map(x => x.mag)) : 0;

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'GRAVE SİSMİK İSTİHBARAT SERVİSİ', iconURL: 'https://i.imgur.com/vHpxL4s.gif' })
        .setColor(maxMag >= 5.0 ? '#ff0000' : '#2b2d31')
        .setTitle(`📡 Filtre: ${filter}`)
        .setDescription(`>>> **Sistem Durumu:** \`ÇEVRİMİÇİ\`\n**Filtre:** \`${minM > 0 ? minM + ' Mw+' : 'Yok'}\`\n**Sayfa:** \`${page + 1}/${maxP}\``)
        .addFields({ name: '📊 Analiz Sonucu', value: `\`\`\`ansi\n\u001b[1;37mEşleşen Kayıt: ${total}\nEn Büyük: ${maxMag} Mw\u001b[0m\`\`\`` });

    if (total === 0) {
        embed.addFields({ name: '⚠️ UYARI', value: '```diff\n- Aranan bölgede veya güçte sismik veri bulunamadı.```' });
        return { embed, total };
    }

    current.forEach((d, i) => {
        const risk = getRiskAnalysis(d.mag, d.dep);
        const mapUrl = `https://www.google.com/maps?q=${d.lat},${d.lon}`;
        embed.addFields({
            name: `📍 [${page * perPage + i + 1}] ${d.loc}`,
            value: `\`\`\`ansi\n` +
                   `\u001b[1;30m┌── Güç:\u001b[0m ${risk.ansi}${d.mag} Mw\u001b[0m\n` +
                   `\u001b[1;30m├── Risk:\u001b[0m ${risk.label}\n` +
                   `\u001b[1;30m└── Derinlik:\u001b[0m \u001b[1;34m${d.dep} KM\u001b[0m\n` +
                   `\`\`\`\n[🗺️ Harita](${mapUrl}) | \`⏱️ ${d.t}\``
        });
    });

    return { embed, total };
};

module.exports.run = async (client, message) => {
    const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor('#2b2d31').setDescription('📡 **Grave:** Sismik ağlar taranıyor...')] });
    let data = await fetchData();
    if (!data) return msg.edit({ content: '❌ Veri çekilemedi.' });

    let page = 0, filter = "Tümü", minM = 0;

    const comps = (p, t) => [
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('m').setPlaceholder('🔍 Analiz Modu / Filtreler...').addOptions([
                { label: 'Tüm Hareketler (SIFIRLA)', value: 'reset', emoji: '🌐' },
                { label: 'Hissedilenler (4.0+)', value: '4', emoji: '🟠' },
                { label: 'Kritik Eşik (5.5+)', value: '5.5', emoji: '🔴' },
                { label: 'Verileri Dışa Aktar (.ZIP)', value: 'zip', emoji: '💾' }
            ])
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('p').setLabel('GERİ').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
            new ButtonBuilder().setCustomId('s').setLabel('BÖLGE TARAMASI').setStyle(ButtonStyle.Primary).setEmoji('🛰️'),
            new ButtonBuilder().setCustomId('r').setLabel('YENİLE').setStyle(ButtonStyle.Success).setEmoji('🔄'),
            new ButtonBuilder().setCustomId('n').setLabel('İLERİ').setStyle(ButtonStyle.Secondary).setDisabled((p + 1) * perPage >= t)
        )
    ];

    const refresh = async (i = null) => {
        const res = buildUltraEmbed(data, page, filter, minM);
        const payload = { embeds: [res.embed], components: comps(page, res.total) };
        try { i ? await i.update(payload) : await msg.edit(payload); } catch (e) {}
    };

    await refresh();

    const collector = msg.createMessageComponentCollector({ time: 900000 });
    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: 'Bu oturum size özeldir.', ephemeral: true });

        if (i.isStringSelectMenu()) {
            if (i.values[0] === 'reset') {
                filter = "Tümü"; minM = 0; page = 0; // Her şeyi sıfırlayan ana sayfa fixi
            } else if (i.values[0] === 'zip') {
                await i.deferReply({ ephemeral: true });
                const zip = new AdmZip();
                const filtered = data.filter(x => filter === "Tümü" || x.loc.toLowerCase().includes(filter.toLowerCase()));
                let txt = `GRAVE RAPOR\n\n`;
                filtered.forEach(d => txt += `[${d.d} ${d.t}] M:${d.mag} | D:${d.dep}km | YER:${d.loc}\n`);
                zip.addFile('analiz.txt', Buffer.from(txt));
                return i.followUp({ content: '📂 Arşiv hazır.', files: [new AttachmentBuilder(zip.toBuffer(), { name: 'grave_sismik.zip' })] });
            } else {
                minM = parseFloat(i.values[0]); page = 0;
            }
            await refresh(i);
        }

        if (i.customId === 'p') { page--; await refresh(i); }
        if (i.customId === 'n') { page++; await refresh(i); }
        if (i.customId === 'r') { data = await fetchData(); page = 0; await refresh(i); }
        if (i.customId === 's') {
            const modal = new ModalBuilder().setCustomId('src').setTitle('SİSMİK TARAMA');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in').setLabel('BÖLGE / ŞEHİR ADI').setStyle(TextInputStyle.Short).setRequired(true)));
            return i.showModal(modal);
        }
    });

    client.on('interactionCreate', async m => {
        if (!m.isModalSubmit() || m.customId !== 'src') return;
        filter = m.fields.getTextInputValue('in') || "Tümü"; page = 0;
        await refresh(m);
    });
};

module.exports.conf = { aliases: ['depremler', 'sismik'] };
module.exports.help = { name: 'deprem' };