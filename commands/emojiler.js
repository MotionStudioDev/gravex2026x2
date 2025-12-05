const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const axios = require('axios'); // Dosya boyutu için axios kullanacağız

module.exports.run = async (client, message, args) => {
    
    // Tüm emojileri çek ve gerekli bilgileri hazırla
    const allEmojis = message.guild.emojis.cache.map(e => ({
        gösterim: `${e} \`${e.name}\``,
        id: e.id,
        url: e.url,
        name: e.name,
        animated: e.animated // Animasyonlu mu?
    }));

    if (allEmojis.length === 0) {
        // ... (Emoji bulunamadı kısmı aynı kalır)
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('Emoji Bulunamadı')
            .setDescription('Bu sunucuda hiç özel emoji yok.')
            .setFooter({ text: 'Emoji sistemi' });
        return message.channel.send({ embeds: [embed] });
    }

    let currentFilter = 'ALL'; // ALL, STATIC, ANIMATED
    let page = 0;
    let filteredEmojis = allEmojis;

    /**
     * Filtreye göre emoji listesini hazırlar.
     */
    const applyFilter = (filter) => {
        if (filter === 'STATIC') {
            return allEmojis.filter(e => !e.animated);
        } else if (filter === 'ANIMATED') {
            return allEmojis.filter(e => e.animated);
        } else {
            return allEmojis;
        }
    };
    
    /**
     * Dosya boyutunu kilobayt cinsinden çeker.
     */
    async function fetchFileSize(url) {
        try {
            const response = await axios.head(url);
            const size = response.headers['content-length'];
            if (size) {
                return (parseInt(size) / 1024).toFixed(2) + ' KB';
            }
            return 'Bilinmiyor';
        } catch (e) {
            return 'Hata';
        }
    }


    /**
     * Embed'i oluşturur.
     */
    const gösterEmbed = async (index, emojisList, filter) => {
        if (emojisList.length === 0) {
            return new EmbedBuilder()
                .setColor('Grey')
                .setTitle(`📦 Sunucu Emojisi (${filter})`)
                .setDescription(`Bu filtrede (\`${filter}\`) gösterilecek emoji bulunamadı.`);
        }

        const emoji = emojisList[index];
        const fileSize = await fetchFileSize(emoji.url);
        
        // Filtre bilgisi
        let filterStatus = filter === 'ALL' ? 'Tümü' : (filter === 'STATIC' ? 'Statik' : 'Animasyonlu');

        return new EmbedBuilder()
            .setColor(emoji.animated ? '#f1c40f' : '#3498db') // Animasyonluya sarı, Statik'e mavi
            .setTitle(`📦 Sunucu Emojisi (${index + 1}/${emojisList.length})`)
            .setDescription(`${emoji.gösterim}\n**ID:** \`${emoji.id}\``)
            .setImage(emoji.url) // büyük görsel
            .addFields(
                { name: 'Animasyonlu', value: emoji.animated ? 'Evet (GIF)' : 'Hayır (PNG)', inline: true },
                { name: 'Dosya Boyutu', value: fileSize, inline: true },
                { name: 'Filtre', value: filterStatus, inline: true },
            )
            .setFooter({ text: 'Butonlarla gezinebilirsin. | Komutu kullanan: ' + message.author.tag });
    };

    /**
     * Buton grubunu oluşturur.
     */
    const row = (currentIndex, listLength, filter) => {
        // Filtre butonları
        const filterRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('filter_all').setLabel('Tümü').setStyle(filter === 'ALL' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('filter_static').setLabel('Statik').setStyle(filter === 'STATIC' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('filter_animated').setLabel('Animasyonlu').setStyle(filter === 'ANIMATED' ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
        
        // Gezinme ve İndirme butonları
        const navRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Önceki').setStyle(ButtonStyle.Primary).setDisabled(currentIndex === 0 || listLength === 0),
            new ButtonBuilder().setCustomId('download').setLabel('📥 İndir').setStyle(ButtonStyle.Success).setDisabled(listLength === 0),
            new ButtonBuilder().setCustomId('url').setLabel('🔗 URL').setStyle(ButtonStyle.Link).setURL(listLength === 0 ? 'https://discord.com' : emojis[currentIndex].url), // URL butonu eklendi
            new ButtonBuilder().setCustomId('next').setLabel('Sonraki ➡️').setStyle(ButtonStyle.Primary).setDisabled(currentIndex === listLength - 1 || listLength === 0)
        );
        
        return [filterRow, navRow]; // İki satır buton döndür
    };

    // İlk gönderim
    const msg = await message.channel.send({ 
        embeds: [await gösterEmbed(page, filteredEmojis, currentFilter)], 
        components: row(page, filteredEmojis.length, currentFilter) 
    });

    const collector = msg.createMessageComponentCollector({ time: 300000 }); // 5 dakika

    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
        }
        
        let changed = false;

        // --- FİLTRELEME İŞLEMLERİ ---
        if (i.customId.startsWith('filter_')) {
            const newFilter = i.customId.replace('filter_', '').toUpperCase();
            if (newFilter !== currentFilter) {
                currentFilter = newFilter;
                filteredEmojis = applyFilter(currentFilter);
                page = 0; // Filtre değişince başa dön
                changed = true;
            }
        } 
        
        // --- GEZİNME İŞLEMLERİ ---
        else if (i.customId === 'prev' && page > 0) {
            page--;
            changed = true;
        } else if (i.customId === 'next' && page < filteredEmojis.length - 1) {
            page++;
            changed = true;
        }

        // --- İNDİRME İŞLEMİ ---
        else if (i.customId === 'download') {
            const currentEmoji = filteredEmojis[page];
            const ext = currentEmoji.url.endsWith('.gif') ? 'gif' : 'png';
            const attachment = new AttachmentBuilder(currentEmoji.url, { name: `${currentEmoji.name}.${ext}` });
            
            // Ephemeral (sadece kullanıcıya görünen) yanıt
            return i.reply({ content: `📥 **${currentEmoji.name}** emojisini indiriliyor!`, files: [attachment], ephemeral: true });
        }

        if (changed) {
            // Embed ve butonları güncelle
            await i.update({ 
                embeds: [await gösterEmbed(page, filteredEmojis, currentFilter)], 
                components: row(page, filteredEmojis.length, currentFilter) 
            });
        } else {
             // Değişiklik yoksa (örneğin aynı filtreye basıldıysa)
             await i.deferUpdate();
        }
    });

    collector.on('end', async () => {
        try {
            await msg.edit({ components: [] });
        } catch {}
    });
};

module.exports.conf = {
    aliases: ['emojilist', 'emojiler', 'serveremojis']
};

module.exports.help = {
    name: 'emojiler',
    description: 'Sunucudaki özel emojileri filtreleme, büyük görsel, boyut ve indirme desteğiyle listeler.'
};
