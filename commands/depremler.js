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

const getBarDesign = (m) => {
    if (m >= 7.0) return { label: '\u001b[1;31mKRİTİK', wave: '\u001b[1;31m██████████' };
    if (m >= 6.0) return { label: '\u001b[1;31mŞİDDETLİ', wave: '\u001b[1;31m████████░░' };
    if (m >= 5.0) return { label: '\u001b[1;33mGÜÇLÜ', wave: '\u001b[1;33m██████░░░░' };
    if (m >= 4.0) return { label: '\u001b[1;36mSARSICI', wave: '\u001b[1;36m████░░░░░░' };
    return { label: '\u001b[1;32mHAFİF', wave: '\u001b[1;32m██░░░░░░░░' };
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

const buildBarEmbed = (list, page, filter, minM) => {
    const filtered = list.filter(x => x.mag >= minM && (filter === "Tümü" || x.loc.toUpperCase().includes(filter.toUpperCase())));
    const total = filtered.length;
    const maxP = Math.ceil(total / perPage) || 1;
    const current = filtered.slice(page * perPage, (page + 1) * perPage);
    
    const embed = new EmbedBuilder()
        .setAuthor({ name: 'GraveBOT Depremler Sistemi', iconURL: 'https://cdn.discordapp.com/emojis/1043132641013735434.gif' })
        .setColor('#2b2d31')
        .setDescription(`**📡 Durum:** \`Sistem Aktif\` | **Filtre:** \`${filter}\` | **Eşik:** \`${minM}Mw\``)
        .setFooter({ text: `Grave Deprem Sistemleri • Sayfa ${page + 1}/${maxP}` })
        .setTimestamp();

    if (total === 0 || current.length === 0) {
        embed.addFields({ name: '⚠️ BİLGİ', value: '```fix\nKriterlere uygun sismik dalga bulunamadı.```' });
        return { embed, total };
    }

    let body = "";
    current.forEach((d, i) => {
        const v = getBarDesign(d.mag);
        const mapUrl = `https://www.google.com/maps?q=${d.lat},${d.lon}`;
        
        const entry = `**#${page * perPage + i + 1} | KAYIT ANALİZİ**\n` +
                `\`\`\`ansi\n` +
                `\u001b[1;30m[ DURUM  ]\u001b[0m : ${v.label}\u001b[0m\n` +
                `\u001b[1;30m[ KONUM  ]\u001b[0m : \u001b[1;37m${d.loc}\u001b[0m\n` +
                `\u001b[1;30m[ GÜÇ    ]\u001b[0m : \u001b[1;37m${d.mag} Mw\u001b[0m\n` +
                `\u001b[1;30m[ GRAFİK ]\u001b[0m : ${v.wave}\u001b[0m\n` +
                `\u001b[1;30m[ DETAY  ]\u001b[0m : \u001b[1;34m${d.dep}KM\u001b[0m | \u001b[1;34m${d.t}\u001b[0m\n` +
                `\`\`\`\n` +
                `**[📍 KONUMU GÖR](${mapUrl})**\n` +
                `──────────────────────────────\n`;
        
        if ((body + entry).length < 1000) body += entry;
    });

    embed.addFields({ name: '📑 SİSMİK VERİ LİSTESİ', value: body || 'Veri hatası.' });
    return { embed, total };
};

module.exports.run = async (client, message) => {
    const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor('Yellow').setDescription('<a:yukle:1440677432976867448> **Sunucuya bağlanıyor...**')] });
    let data = await fetchData();
    if (!data) return msg.edit({ content: '❌ Sunucuya bağlanılamadı.' });

    let page = 0, filter = "Tümü", minM = 0;

    const comps = (p, t) => [
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('m').setPlaceholder('📊 Filtre / Arşiv Seçin...').addOptions([
                { label: 'Hepsi', value: '0', emoji: '🌐' },
                { label: '3.0+', value: '3', emoji: '🟢' },
                { label: '4.5+', value: '4.5', emoji: '🟡' },
                { label: '6.0+', value: '6', emoji: '🔴' },
                { label: 'Verileri Arşivle', value: 'archive_zip', emoji: '1454762951578877964' }
            ])
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('p')
                .setEmoji('1454771071411552381')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(p === 0),
            new ButtonBuilder()
                .setCustomId('s')
                .setEmoji('1454768274720952444')
                .setLabel('Bölge Ara')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('r')
                .setEmoji('1440677432976867448')
                .setLabel('Verileri Yenile')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('n')
                .setEmoji('1454771000993648660')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled((p + 1) * perPage >= t)
        )
    ];

    const refresh = async (i = null) => {
        const res = buildBarEmbed(data, page, filter, minM);
        const payload = { embeds: [res.embed], components: comps(page, res.total) };
        try { if (i) await i.update(payload); else await msg.edit(payload); } catch (e) {}
    };

    await refresh();

    const collector = msg.createMessageComponentCollector({ time: 600000 });
    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: 'Erişim izniniz yok.', ephemeral: true });

        if (i.isStringSelectMenu()) {
            if (i.values[0] === 'archive_zip') {
                await i.deferReply({ ephemeral: true });
                try {
                    const zip = new AdmZip();
                    const filteredData = data.filter(x => filter === "Tümü" || x.loc.toUpperCase().includes(filter.toUpperCase()));
                    let fileContent = `--- GRAVE SİSMİK ARŞİV ---\nFiltre: ${filter}\n\n`;
                    filteredData.forEach((d, idx) => {
                        fileContent += `[${idx + 1}] Tarih: ${d.d} ${d.t} | Güç: ${d.mag} Mw | Konum: ${d.loc}\n`;
                    });
                    zip.addFile(`sismik_analiz.txt`, Buffer.from(fileContent));
                    return i.followUp({ content: '✅ Arşiv hazır.', files: [new AttachmentBuilder(zip.toBuffer(), { name: `grave_sismik.zip` })] });
                } catch (e) { return i.followUp({ content: '❌ Hata.' }); }
            } else {
                minM = parseFloat(i.values[0]); page = 0;
                await refresh(i);
            }
        }

        if (i.customId === 'p') { page--; await refresh(i); }
        if (i.customId === 'n') { page++; await refresh(i); }
        if (i.customId === 'r') { data = await fetchData(); page = 0; await refresh(i); }
        if (i.customId === 's') {
            const modal = new ModalBuilder().setCustomId('mod').setTitle('ARAMA');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('txt').setLabel('Bölge').setStyle(TextInputStyle.Short)));
            return i.showModal(modal);
        }
    });

    client.on('interactionCreate', async m => {
        if (!m.isModalSubmit() || m.customId !== 'mod') return;
        filter = m.fields.getTextInputValue('txt') || "Tümü"; page = 0;
        await refresh(m);
    });
};

module.exports.conf = { aliases: ['depremler'] };
module.exports.help = { name: 'deprem' };
