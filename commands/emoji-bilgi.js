const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
    const emojiRaw = args[0];
    
    // --- HATA KONTROLÜ (Girdi Eksikliği) ---
    if (!emojiRaw) {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('🚫 Hatalı Kullanım')
                    .setDescription('Lütfen bir **özel emoji** belirtin. Standart emojiler (😊) desteklenmez.')
                    .setFooter({ text: 'Örnek: g!emoji-bilgi <:emoji:1234567890> veya g!emoji-bilgi 1234567890' })
            ]
        });
    }

    // Mention veya ID ayıklama
    const mentionMatch = emojiRaw.match(/<a?:\w+:(\d+)>/);
    const emojiId = mentionMatch ? mentionMatch[1] : emojiRaw;
    
    // Yükleniyor Embed'i (Eğer fetch işlemi zaman alırsa)
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Emoji bilgisi çekiliyor...');
    
    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    let emoji;
    try {
        // Emoji'yi botun önbelleğinden çek
        emoji = client.emojis.cache.get(emojiId);

        // Eğer önbellekte yoksa ama ID geçerliyse, botun erişimi olmadığı anlamına gelir.
        if (!emoji) {
            throw new Error('NotFound');
        }

    } catch (e) {
        return msg.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('🔍 Emoji Bulunamadı')
                    .setDescription('Bu özel emoji botun erişiminde değil, botun bulunduğu bir sunucuya ait değil veya silinmiş.')
                    .setFooter({ text: `Emoji ID: ${emojiId}` })
            ]
        });
    }

    const fields = [
        { name: 'Animasyonlu mu?', value: emoji.animated ? 'Evet (GIF)' : 'Hayır (PNG)', inline: true },
        { name: 'Oluşturulma', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`, inline: true }, // R formatına çevrildi
        { name: 'Server ID', value: `\`${emoji.guild.id}\``, inline: true },
        { name: 'Sunucu', value: `\`${emoji.guild.name}\``, inline: true },
    ];
    
    let authorTag = 'Bilinmiyor/API sağlamıyor';
    try {
        // Emoji'yi kimin yüklediğini çekme (Promise döndürür)
        const author = await emoji.fetchAuthor();
        authorTag = author.tag;
        fields.push({ name: 'Yükleyen', value: authorTag, inline: true });
    } catch (err) {
        // author bilgisini çekemezse (genellikle emoji botun bulunduğu bir sunucuda değilse)
        console.error(`Yükleyen bilgisi çekilemedi: ${err.message}`);
        fields.push({ name: 'Yükleyen', value: 'Bilinmiyor (Erişim kısıtlı)', inline: true });
    }
    
    // Embed oluşturma
    const embed = new EmbedBuilder()
        .setColor(emoji.animated ? 'Purple' : 'Orange') // Animasyonlu ise mor yapalım
        .setTitle(`🧠 Emoji Bilgisi: ${emoji.name}`)
        .setThumbnail(emoji.url)
        .setDescription(`**Gösterim:** ${emoji}\n**ID:** \`${emoji.id}\``)
        .addFields(fields)
        .addFields(
            { name: 'Emoji URL (Büyük Boyut)', value: `[Tıkla](${emoji.url})`, inline: false }
        )
        .setFooter({ text: `Grave Emoji bilgisi ${new Date().toLocaleTimeString('tr-TR')} tarihinde çekildi.` });

    await msg.edit({ embeds: [embed] });
};

module.exports.conf = {
    aliases: ['emoji', 'emojibilgi']
};

module.exports.help = {
    name: 'emoji-bilgi',
    description: 'Belirtilen özel Discord emojisi hakkında detaylı bilgi (sunucu, yükleyen, tarih) gösterir.'
};
