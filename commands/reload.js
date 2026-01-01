const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// --- AYARLAR ---
const SAHIP_ID = "702901632136118273"; 
const LOG_KANAL_ID = "1447918299554910305"; 

module.exports.run = async (client, message, args) => {
    // Yetki Kontrolü
    if (message.author.id !== SAHIP_ID) {
        const yetkiYok = new EmbedBuilder()
            .setColor('#ff4747')
            .setTitle('🚫 Erişim Engellendi')
            .setDescription('Bu komut **Çekirdek Sistem** yetkilendirmesi gerektirir.')
            .setFooter({ text: 'Grave Güvenlik Protokolü' });
        return message.reply({ embeds: [yetkiYok] });
    }

    // Onay Embed'i
    const onayEmbed = new EmbedBuilder()
        .setColor('#5865f2')
        .setAuthor({ name: 'SİSTEM REBOOT PROTOKOLÜ', iconURL: client.user.displayAvatarURL() })
        .setTitle('🔄 Çekirdek Yeniden Başlatma Onayı')
        .setDescription('Sistemi yeniden başlatmak üzeresiniz. Onay verdiğinizde bot **Idle (Sarı)** moda geçip işlemi başlatacaktır.')
        .addFields(
            { name: '🔌 Bağlantı', value: 'WebSocket kesilecek ve .bat döngüsü tetiklenecek.', inline: true },
            { name: '📡 Gecikme', value: `\`${client.ws.ping}ms\``, inline: true }
        )
        .setThumbnail('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJmZzI0ZzRwamZ4ZzRwamZ4ZzRwamZ4ZzRwamZ4ZzRwamZ4ZzRwaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKMGpxfPNHbcV0Y/giphy.gif')
        .setFooter({ text: 'Onay veriyor musunuz?' });

    const butonlar = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('Protokolü Başlat').setStyle(ButtonStyle.Danger).setEmoji('⚡'),
        new ButtonBuilder().setCustomId('cancel').setLabel('İşlemi Durdur').setStyle(ButtonStyle.Secondary).setEmoji('✖️')
    );

    const anaMesaj = await message.channel.send({ embeds: [onayEmbed], components: [butonlar] });
    const collector = anaMesaj.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 20000 });

    collector.on('collect', async i => {
        if (i.customId === 'cancel') {
            await i.update({ embeds: [new EmbedBuilder().setColor('#f2f2f2').setTitle('❌ İşlem İptal Edildi')], components: [] });
            return collector.stop();
        }

        if (i.customId === 'confirm') {
            await i.deferUpdate();

            // --- 🟡 YENİDEN BAŞLATMA MODUNA GEÇİŞ ---
            try {
                await client.user.setStatus('idle');
                await client.user.setActivity('Yeniden başlatılıyorum...', { type: 3 }); // "Yeniden başlatılıyorum... izliyor"
            } catch (e) { console.error("Durum degistirme hatasi:", e); }

            // Log Kanalına Bildirim
            const logKanal = client.channels.cache.get(LOG_KANAL_ID);
            if (logKanal) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setAuthor({ name: 'Sistem Log: REBOOT', iconURL: message.author.displayAvatarURL() })
                    .setDescription('**Bot şu an kapanıyor ve döngüye giriyor...**')
                    .addFields(
                        { name: '🛠️ Yetkili', value: `<@${message.author.id}>`, inline: true },
                        { name: '🟡 Durum', value: '`Idle / Rebooting`', inline: true }
                    )
                    .setTimestamp();
                await logKanal.send({ embeds: [logEmbed] });
            }

            // Kullanıcıya bilgi ver
            await anaMesaj.edit({ 
                embeds: [new EmbedBuilder().setColor('#ffaa00').setTitle('🚀 Protokol Devrede').setDescription('Sistem boşta moduna alındı ve kapatılıyor...').setFooter({ text: 'Birkaç saniye içinde aktif olacak.' })], 
                components: [] 
            });

            // .BAT DOSYASINI TETİKLEMEK İÇİN KAPAT
            setTimeout(() => { 
                process.exit(0); 
            }, 2000);
        }
    });
};

module.exports.conf = { aliases: ['reboot', 'yenidenbaslat'] };
module.exports.help = { name: 'restart' };