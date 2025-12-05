const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

module.exports.run = async (client, message, args) => {
    
    // ⚠️ Düzeltme 1: DeprecationWarning için Emoji#url yerine Emoji#imageURL() kullanıldı.
    const allEmojis = message.guild.emojis.cache.map(e => ({
        gösterim: `${e} \`${e.name}\``,
        id: e.id,
        url: e.imageURL({ forceStatic: false }), // Yeni ve doğru kullanım
        name: e.name,
        animated: e.animated 
    }));

    if (allEmojis.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('Emoji Bulunamadı')
            .setDescription('Bu sunucuda hiç özel emoji yok.')
            .setFooter({ text: 'Emoji sistemi' });
        return message.channel.send({ embeds: [embed] });
    }

    let currentFilter = 'ALL'; 
    let page = 0;
    let filteredEmojis = allEmojis; // Bu değişkeni kullanacağız

    const applyFilter = (filter) => {
        if (filter === 'STATIC') {
            return allEmojis.filter(e => !e.animated);
        } else if (filter === 'ANIMATED') {
            return allEmojis.filter(e => e.animated);
        } else {
            return allEmojis;
        }
    };
    
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

    const gösterEmbed = async (index, emojisList, filter) => {
        if (emojisList.length === 0) {
            return new EmbedBuilder()
                .setColor('Grey')
                .setTitle(`📦 Sunucu Emojisi (${filter})`)
                .setDescription(`Bu filtrede (\`${filter}\`) gösterilecek emoji bulunamadı.`);
        }

        const emoji = emojisList[index];
        const fileSize = await fetchFileSize(emoji.url);
        
        let filterStatus = filter === 'ALL' ? 'Tümü' : (filter === 'STATIC' ? 'Statik' : 'Animasyonlu');

        return new EmbedBuilder()
            .setColor(emoji.animated ? '#f1c40f' : '#3498db')
            .setTitle(`📦 Sunucu Emojisi (${index + 1}/${emojisList.length})`)
            .setDescription(`${emoji.gösterim}\n**ID:** \`${emoji.id}\``)
            .setImage(emoji.url) 
            .addFields(
                { name: 'Animasyonlu', value: emoji.animated ? 'Evet (GIF)' : 'Hayır (PNG)', inline: true },
                { name: 'Dosya Boyutu', value: fileSize, inline: true },
                { name: 'Filtre', value: filterStatus, inline: true },
            )
            .setFooter({ text: 'Butonlarla gezinebilirsin. | Komutu kullanan: ' + message.author.tag });
    };

    /**
     * ⚠️ Düzeltme 2: ReferenceError giderildi. emojis[currentIndex] yerine
     * gönderilen listeye ait elemanlar (emojisList[currentIndex] veya filteredEmojis[page]) kullanıldı.
     * Ancak row fonksiyonu çağrılırken `filteredEmojis` ve `page` değişkenlerine erişimi olduğu için
     * bu değişkenler doğrudan kullanıldı.
     */
    const row = (currentIndex, listLength, filter) => {
        const currentEmoji = filteredEmojis[currentIndex]; // filteredEmojis değişkeni kullanıldı

        const filterRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('filter_all').setLabel('Tümü').setStyle(filter === 'ALL' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('filter_static').setLabel('Statik').setStyle(filter === 'STATIC' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('filter_animated').setLabel('Animasyonlu').setStyle(filter === 'ANIMATED' ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
        
        const navRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Önceki').setStyle(ButtonStyle.Primary).setDisabled(currentIndex === 0 || listLength <= 1),
            new ButtonBuilder().setCustomId('download').setLabel('📥 İndir').setStyle(ButtonStyle.Success).setDisabled(listLength === 0),
            // Hata burada oluşuyordu. currentEmoji (filteredEmojis[currentIndex]) kullanıldı.
            new ButtonBuilder().setCustomId('url').setLabel('🔗 URL').setStyle(ButtonStyle.Link).setURL(listLength === 0 ? 'https://discord.com' : currentEmoji.url), 
            new ButtonBuilder().setCustomId('next').setLabel('Sonraki ➡️').setStyle(ButtonStyle.Primary).setDisabled(currentIndex === listLength - 1 || listLength <= 1)
        );
        
        return [filterRow, navRow]; 
    };

    // İlk gönderim
    const msg = await message.channel.send({ 
        embeds: [await gösterEmbed(page, filteredEmojis, currentFilter)], 
        components: row(page, filteredEmojis.length, currentFilter) 
    });

    const collector = msg.createMessageComponentCollector({ time: 300000 }); 

    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
        }
        
        let changed = false;

        if (i.customId.startsWith('filter_')) {
            const newFilter = i.customId.replace('filter_', '').toUpperCase();
            if (newFilter !== currentFilter) {
                currentFilter = newFilter;
                filteredEmojis = applyFilter(currentFilter);
                page = 0; 
                changed = true;
            }
        } 
        
        else if (i.customId === 'prev' && page > 0) {
            page--;
            changed = true;
        } else if (i.customId === 'next' && page < filteredEmojis.length - 1) {
            page++;
            changed = true;
        }

        else if (i.customId === 'download') {
            const currentEmoji = filteredEmojis[page];
            const ext = currentEmoji.url.endsWith('.gif') ? 'gif' : 'png';
            
            // Eğer URL .gif veya .png ile bitmiyorsa, statik url'sini kullanalım (genellikle daha güvenlidir)
            const safeUrl = currentEmoji.animated 
                ? message.guild.emojis.cache.get(currentEmoji.id).imageURL({ extension: 'gif' })
                : message.guild.emojis.cache.get(currentEmoji.id).imageURL({ extension: 'png' });

            const attachment = new AttachmentBuilder(safeUrl, { name: `${currentEmoji.name}.${ext}` });
            
            return i.reply({ content: `📥 **${currentEmoji.name}** emojisini indiriliyor!`, files: [attachment], ephemeral: true });
        }

        if (changed) {
            await i.update({ 
                embeds: [await gösterEmbed(page, filteredEmojis, currentFilter)], 
                components: row(page, filteredEmojis.length, currentFilter) 
            });
