// events/dmlog.js dosyası

const { EmbedBuilder } = require('discord.js');

// DM Log Kanal ID'nizi buraya girin!
const DM_LOG_CHANNEL_ID = '1416172498923294830'; 

module.exports = {
    // Discord olayı: messageCreate (mesaj oluşturulduğunda)
    name: 'messageCreate',
    
    // 'client' ve 'message' argümanları bu fonksiyona otomatik olarak iletilir.
    async execute(message, client) {
        
        // Kendi mesajlarını loglamayı engelle
        if (message.author.bot) return;

        // Sadece DM (Özel Mesaj) olduğunda çalıştır
        if (message.channel.type !== 1) return; // type 1 = DM

        // Log kanalını bul
        const logChannel = client.channels.cache.get(DM_LOG_CHANNEL_ID);

        // Kanal bulunamazsa işlemi durdur
        if (!logChannel) {
            console.error(`DM Log kanalı bulunamadı! ID: ${DM_LOG_CHANNEL_ID}`);
            return;
        }

        // --- Log Embed'i Oluşturma ---
        const logEmbed = new EmbedBuilder()
            .setColor('DarkOrange')
            .setTitle('✉️ Yeni Özel Mesaj (DM) Alındı')
            .addFields(
                { name: 'Gönderen', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: false },
                // Mesaj içeriği
                { name: 'Mesaj İçeriği', value: `\`\`\`${message.content.substring(0, 1000)}\`\`\``, inline: false },
                { name: 'Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'DM Log Sistemi' });

        // Eğer mesajda ekler (resim, dosya vb.) varsa
        if (message.attachments.size > 0) {
            const attachmentUrls = message.attachments.map(a => a.url).join('\n');
            logEmbed.addFields({ name: 'Ekler (Dosya/Resim)', value: attachmentUrls, inline: false });
        }

        // Log kanalına mesajı gönder
        try {
            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
            console.error("Log kanalına DM gönderilirken hata oluştu:", error);
        }
    },
};
