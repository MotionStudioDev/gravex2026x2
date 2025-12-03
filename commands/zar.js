const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Rastgele zar atma işlemini gerçekleştiren ana fonksiyon.
 * @param {number} max - Atılacak zarın maksimum değeri.
 * @returns {number} - Atılan zarın sonucu.
 */
function zarAt(max) {
    // 1 ile max arasında rastgele bir sayı üretir.
    return Math.floor(Math.random() * max) + 1;
}

/**
 * Zar sonucuna göre Embed oluşturan fonksiyon.
 * @param {number} sonuc - Zarın sonucu.
 * @param {number} max - Atılan zarın maksimum değeri.
 * @param {object} author - Komutu kullanan kişi (message.author).
 * @returns {EmbedBuilder} - Hazırlanmış Embed.
 */
function createZarEmbed(sonuc, max, author) {
    let emoji;
    if (sonuc === max) {
        emoji = '👑'; // Maksimum sonucu attıysa
    } else if (sonuc === 1) {
        emoji = '💔'; // En düşük sonucu attıysa
    } else {
        emoji = '🎲';
    }
    
    // Rastgele renk atama
    const colors = ['#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#9B59B6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    return new EmbedBuilder()
        .setColor(randomColor)
        .setTitle(`${emoji} ZAR ATMA SONUCU`)
        .setDescription(`**${author.username}** tarafından atılan **1 - ${max}** arasındaki zarın sonucu:`)
        .addFields({
            name: 'Sonuç',
            value: `**${sonuc}**`,
            inline: true
        })
        .setThumbnail(author.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: `Zar tipi: D${max} | Tekrar At butonu 30 saniye sonra devre dışı kalır.` });
}

module.exports.run = async (client, message, args) => {
    // Argümandan maksimum zar değerini al, yoksa varsayılan 6 kullan
    let max = 6;
    if (args[0] && !isNaN(parseInt(args[0]))) {
        max = parseInt(args[0]);
        // Zarın 1'den büyük olmasını sağla
        if (max < 2) max = 6; 
        // Çok büyük sayıları sınırla (isteğe bağlı)
        if (max > 1000) max = 1000; 
    }

    // İlk zarı at
    let sonuc = zarAt(max);
    let embed = createZarEmbed(sonuc, max, message.author);

    // Butonları oluştur
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('zar_tekrar').setLabel('🎲 Yeniden At').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('zar_sil').setLabel('🗑️ Sil').setStyle(ButtonStyle.Danger)
    );

    // Mesajı gönder
    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    // Buton dinleyicisini başlat (Collector)
    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id, // Sadece komutu kullanan cevap verebilir
        time: 30000 // 30 saniye sonra devre dışı kalır
    });

    collector.on('collect', async i => {
        if (i.customId === 'zar_sil') {
            await msg.delete().catch(() => {});
            collector.stop();
        } 
        
        if (i.customId === 'zar_tekrar') {
            // Yeniden zar at
            const yeniSonuc = zarAt(max);
            const newEmbed = createZarEmbed(yeniSonuc, max, message.author);

            // Mesajı güncelle
            await i.update({ embeds: [newEmbed], components: [row] });
        }
    });

    collector.on('end', async () => {
        // Süre dolduğunda veya collector durduğunda butonları devre dışı bırak
        const disabledRow = new ActionRowBuilder().addComponents(
            row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
        // Hata yakalama (mesaj silinmiş olabilir)
        await msg.edit({ components: [disabledRow] }).catch(() => {});
    });
};

module.exports.conf = {
    aliases: ['roll', 'dice', 'zarat']
};

module.exports.help = {
    name: 'zar-at'
};
