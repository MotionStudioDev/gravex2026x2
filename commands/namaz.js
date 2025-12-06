const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');
const axios = require('axios'); // 'npm install axios' ile kurun

const MODAL_ID = 'namaz_vakitleri_modal';

// Diyanet API'si üzerinden ilçe bazlı vakit çekme
// Not: Bu endpoint'ler zaman zaman değişebilir veya kısıtlanabilir.
const API_URL = 'https://iftaranekadarkaldi.com/'; 
// Alternatif API'ler için search yapabilirsiniz.

// Kanal/Komut başlangıcı
module.exports.run = async (client, message, args) => {
    try {
        // --- 1. Başlangıç Butonu ---
        const startEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🕌 Namaz Vakitleri Sorgulama')
            .setDescription('Hangi şehir için vakitleri öğrenmek istiyorsunuz? Aşağıdaki butona tıklayarak şehir adını girin.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('sorgula_btn').setLabel('Şehir Ara ve Sorgula').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('iptal_btn').setLabel('❌ İptal').setStyle(ButtonStyle.Danger)
        );

        const msg = await message.channel.send({ embeds: [startEmbed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000 // 60 saniye süre
        });

        collector.on('collect', async i => {
            if (i.customId === 'iptal_btn') {
                const cancelEmbed = new EmbedBuilder().setColor('#FF0000').setDescription('İşlem iptal edildi.');
                await i.update({ embeds: [cancelEmbed], components: [] });
                return collector.stop();
            }

            if (i.customId === 'sorgula_btn') {
                // --- 2. Modal'ı Açma ---
                collector.stop(); // Buton kolektörünü durdur

                const modal = new ModalBuilder()
                    .setCustomId(MODAL_ID)
                    .setTitle('Şehir/İlçe Adı Girin');

                const sehirInput = new TextInputBuilder()
                    .setCustomId('sehirAdiInput')
                    .setLabel('Şehir veya İlçe Adı (Örn: "İstanbul" veya "Konya/Meram")')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(3);

                modal.addComponents(new ActionRowBuilder().addComponents(sehirInput));
                await i.showModal(modal);

                // --- 3. Modal Yanıtını Yakalama ---
                const modalInteraction = await i.awaitModalSubmit({
                    time: 120000,
                    filter: modalI => modalI.user.id === message.author.id
                }).catch(() => null);

                if (!modalInteraction) {
                    const timeoutEmbed = new EmbedBuilder().setColor('#FEE75C').setDescription('Modal yanıt süresi doldu, işlem iptal edildi.');
                    return msg.edit({ embeds: [timeoutEmbed], components: [] });
                }

                await modalInteraction.deferUpdate(); // Yanıtı hızla kabul et

                const sehirAdi = modalInteraction.fields.getTextInputValue('sehirAdiInput').trim();

                const loadingEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setDescription(`⏳ **${sehirAdi}** için namaz vakitleri çekiliyor...`);
                
                await msg.edit({ embeds: [loadingEmbed], components: [] });


                // --- 4. API'den Veri Çekme ---
                try {
                    const response = await axios.get(`${API_URL}?city=${sehirAdi}`);
                    const vakitler = response.data.times;
                    
                    if (!vakitler || vakitler.error) {
                         const errorEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Veri Bulunamadı')
                            .setDescription(`**"${sehirAdi}"** için namaz vakitleri bulunamadı. Lütfen tam şehir/ilçe adını kontrol edin ve tekrar deneyin.`);
                        return msg.edit({ embeds: [errorEmbed], components: [] });
                    }

                    // --- 5. Sonuç Embed'i ---
                    const resultEmbed = new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle(`🕌 ${vakitler.city} Namaz Vakitleri`)
                        .setDescription(`Bugün, **${vakitler.date}** tarihli vakitler.`)
                        .setFields([
                            { name: 'İmsak', value: `\`${vakitler.Imsak}\``, inline: true },
                            { name: 'Güneş', value: `\`${vakitler.Gunes}\``, inline: true },
                            { name: 'Öğle', value: `\`${vakitler.Ogle}\``, inline: true },
                            { name: 'İkindi', value: `\`${vakitler.Ikindi}\``, inline: true },
                            { name: 'Akşam', value: `\`${vakitler.Aksam}\``, inline: true },
                            { name: 'Yatsı', value: `\`${vakitler.Yatsi}\``, inline: true }
                        ])
                        .setFooter({ text: 'Veriler harici bir API üzerinden sağlanmıştır.' })
                        .setTimestamp();

                    await msg.edit({ embeds: [resultEmbed], components: [] });

                } catch (apiError) {
                    console.error('Namaz vakitleri API hatası:', apiError.message);
                    const finalErrorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ API Bağlantı Hatası')
                        .setDescription('Namaz vakitleri çekilirken bir sorun oluştu. API adresi veya sunucu bağlantısını kontrol edin.');
                    await msg.edit({ embeds: [finalErrorEmbed], components: [] });
                }
            }
        });

        collector.on('end', async (collected, reason) => {
             if (reason === 'time' || reason === 'idle') {
                try {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#FEE75C')
                        .setDescription('İşlem süresi doldu.');
                    await msg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                } catch {}
             }
        });

    } catch (err) {
        console.error('namaz komutu genel hatası:', err);
        message.channel.send('⚠️ | Namaz vakitleri sorgulanırken beklenmedik bir hata oluştu.');
    }
};

module.exports.conf = { aliases: ['vakit', 'prayer', 'iftar'] };
module.exports.help = { name: 'namaz' };
