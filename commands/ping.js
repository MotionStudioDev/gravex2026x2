const { EmbedBuilder } = require('discord.js');

// Gecikmeye göre ilerleme çubuğu oluşturan yardımcı fonksiyon
function createProgressBar(ping, maxPing = 500, barLength = 20) {
    const normalizedPing = Math.min(ping, maxPing) / maxPing;
    const filledLength = Math.round((1 - normalizedPing) * barLength);
    const emptyLength = barLength - filledLength;
    
    // Daha belirgin ve ayrı renkli bloklar kullanarak görseli zenginleştirme
    const filledBarChar = '🟦'; // Mavi dolu blok (veya başka bir renk emojisi)
    const emptyBarChar = '⬜'; // Gri boş blok

    const filledBar = filledBarChar.repeat(filledLength);
    const emptyBar = emptyBarChar.repeat(emptyLength);
    
    let description = '';
    let color = 'Green'; // Varsayılan renk
    
    if (ping <= 50) { 
        description = `Discord API sunucuları ile bot arasındaki gecikme **${ping}ms**'dir. Mükemmel bağlantı!`;
        color = 'Green';
    } else if (ping <= 150) { 
        description = `Discord API sunucuları ile bot arasındaki gecikme **${ping}ms**'dir. İyi bağlantı.`;
        color = 'Yellow';
    } else if (ping <= 300) {
        description = `Discord API sunucuları ile bot arasındaki gecikme **${ping}ms**'dir. Ortalama bağlantı.`;
        color = 'Orange';
    } else {
        description = `Discord API sunucuları ile bot arasındaki gecikme **${ping}ms**'dir. Yüksek gecikme var.`;
        color = 'Red';
    }

    const progressBar = `${filledBar}${emptyBar}`;
    
    return { progressBar, description, color };
}

module.exports.run = async (client, message, args) => {
    // İlk embed: analiz başlıyor
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Lütfen bekleyin, ağ verileri analiz ediliyor...')
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true })); // Botun kendi avatarı

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // Ölçüm (API gecikmesi)
    const apiPing = Math.round(client.ws.ping);
    
    // İlerleme çubuğunu ve açıklamayı oluştur
    const { progressBar, description, color } = createProgressBar(apiPing);

    // Sonuç embed'i
    const resultEmbed = new EmbedBuilder()
        .setColor(color) // Gecikmeye göre renk
        .setTitle('🌐 Ağ Bağlantı Analizi') // Resimdeki gibi başlık
        .setDescription(description)
        .addFields(
            { 
                name: `\u200b`, // Görsel ayırma için boş alan
                value: `\u200b`
            },
            { 
                name: `SİSTEM GECİKMESİ (API)`, 
                value: `**${progressBar} \`${apiPing} MS\`**\n\nDiscord API sunucularına olan anlık bağlantı gecikmesi.`,
                inline: false 
            }
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true })) // Botun kendi avatarı
        .setFooter({ text: `Talep: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    await msg.edit({ content: '\u200b', embeds: [resultEmbed] }); 
};

module.exports.conf = {
  aliases: ["ağ", "network"]
};

module.exports.help = {
  name: 'ping'
};
