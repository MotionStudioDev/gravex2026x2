const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Yazı Tura atma işlemini gerçekleştirir.
 * @returns {string} - "Yazı" veya "Tura" sonucunu döndürür.
 */
function yaziTuraAt() {
    // Math.random() < 0.5 ise 'Yazı', değilse 'Tura'
    return Math.random() < 0.5 ? 'Yazı' : 'Tura';
}

/**
 * Yazı Tura sonucuna göre Embed oluşturan fonksiyon.
 * @param {string} sonuc - Atışın sonucu ("Yazı" veya "Tura").
 * @param {object} author - Komutu kullanan kişi (message.author).
 * @returns {EmbedBuilder} - Hazırlanmış Embed.
 */
function createYaziTuraEmbed(sonuc, author) {
    let emoji = sonuc === 'Yazı' ? '🪙' : '👑'; // Emoji seçimi
    let color = sonuc === 'Yazı' ? '#F39C12' : '#2980B9'; // Renk seçimi
    
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(`💰 YAZI TURA SONUCU`)
        .setDescription(`**${author.username}** tarafından yapılan atışın sonucu:`)
        .addFields({
            name: 'Sonuç',
            value: `**${emoji} ${sonuc}**`,
            inline: true
        })
        .setThumbnail(author.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: `Atışı başlatan: ${author.username} | Tekrar At butonu 30 saniye sonra devre dışı kalır.` });
}

module.exports.run = async (client, message, args) => {
    // İlk atışı yap
    let sonuc = yaziTuraAt();
    let embed = createYaziTuraEmbed(sonuc, message.author);

    // Butonları oluştur
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('yt_tekrar').setLabel('🔄 Tekrar At').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('yt_sil').setLabel('🗑️ Sil').setStyle(ButtonStyle.Danger)
    );

    // Mesajı gönder
    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    // Buton dinleyicisini başlat (Collector)
    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id, // Sadece komutu kullanan cevap verebilir
        time: 30000 // 30 saniye sonra devre dışı kalır
    });

    collector.on('collect', async i => {
        if (i.customId === 'yt_sil') {
            await msg.delete().catch(() => {});
            collector.stop();
        } 
        
        if (i.customId === 'yt_tekrar') {
            // Yeniden atış yap
            const yeniSonuc = yaziTuraAt();
            const newEmbed = createYaziTuraEmbed(yeniSonuc, message.author);

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
    aliases: ['yazıtura', 'flip', 'paraat']
};

module.exports.help = {
    name: 'yazı-tura'
};
