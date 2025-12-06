const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message, args) => {
    try {
        const userId = message.author.id;
        
        // İskender malzemelerinin başlangıç durumu
        const choices = {
            patlican: { emoji: '🍆', label: 'Patlıcan Salatası', added: false },
            yogurt: { emoji: '🥣', label: 'Ekstra Yoğurt', added: false },
            biber: { emoji: '🌶️', label: 'Köz Biber', added: false }
        };
        
        let sosEklendi = false; // Sosun durumunu takip etmek için

        /**
         * Malzeme seçimine göre güncel Embed'i oluşturur.
         */
        const getIskenderEmbed = (currentChoices, sosDurumu) => {
            const addedIngredients = Object.values(currentChoices)
                .filter(item => item.added)
                .map(item => item.emoji + ' ' + item.label)
                .join(', ');
            
            let description = `Hazırlanan İskenderinde şu an: **${addedIngredients || 'Sadece Et ve Pide'}** var. 🥩🍞\n\n`;
            
            description += sosDurumu 
                ? '🧈 **Sos Döküldü!** Yemeye hazır. 🤤'
                : '🤔 **Son Aşama:** Tereyağını dökmeyi unutma!';

            return new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🔥 Kendi İskenderini Hazırla!')
                .setDescription(description)
                .setFooter({ text: '30 saniye içinde sosu döküp bitirmelisin.' });
        };

        /**
         * Malzeme seçimine göre güncel butonları içeren ActionRow'u oluşturur.
         */
        const getIskenderActionRow = (currentChoices, sosDurumu, disabled = false) => {
            const row1 = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();
            
            // Malzeme Butonları
            for (const key in currentChoices) {
                const item = currentChoices[key];
                row1.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`iskender_${key}`)
                        .setLabel(item.label)
                        .setEmoji(item.emoji)
                        .setStyle(item.added ? ButtonStyle.Success : ButtonStyle.Primary)
                        .setDisabled(disabled || sosDurumu) // Sos dökülünce malzeme eklenemez
                );
            }
            
            // Sos ve Bitir Butonları
            row2.addComponents(
                new ButtonBuilder()
                    .setCustomId('iskender_sos')
                    .setLabel('🧈 Kızgın Yağı Dök!')
                    .setEmoji('🔥')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled || sosDurumu) // Sos sadece bir kez dökülebilir
            );
            
            row2.addComponents(
                 new ButtonBuilder()
                    .setCustomId('iskender_bitir')
                    .setLabel('🍴 Afiyet Olsun!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled || !sosDurumu) // Sos dökülmeden bitirilemez
            );
            
            return [row1, row2];
        };
        
        const initialEmbed = getIskenderEmbed(choices, sosEklendi);
        const initialRows = getIskenderActionRow(choices, sosEklendi);

        const msg = await message.channel.send({ embeds: [initialEmbed], components: initialRows });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === userId && i.customId.startsWith('iskender_'),
            time: 30000
        });

        collector.on('collect', async i => {
            await i.deferUpdate();

            if (i.customId === 'iskender_sos') {
                sosEklendi = true;
            } else if (i.customId === 'iskender_bitir') {
                collector.stop('created'); // İskender bitti sinyalini gönder

                const selectedIngredients = Object.values(choices)
                    .filter(item => item.added)
                    .map(item => item.label)
                    .join(', ') || 'hiçbir şey';

                const finalIskenderEmbed = new EmbedBuilder()
                    .setColor('#FF4500')
                    .setTitle('🍽️ İSKENDER KEBAP HAZIR!')
                    .setDescription(`Afiyet olsun, **${message.author.username}**!\n\n` +
                                    `**Ekstralar:** ${selectedIngredients}.\n` +
                                    `**Sos Durumu:** ✅ Kızgın yağ ve sos başarıyla döküldü!`)
                    // Yerel dosyayı kullanmak için 'attachment://' öneki ve dosya adı kullanılır
                    .setImage('attachment://iskender.png') 
                    .setFooter({ text: 'Bir Porsiyon Mutluluk' })
                    .setTimestamp();
                
                // Tüm butonları devre dışı bırak
                const disabledRows = getIskenderActionRow(choices, sosEklendi, true);

                await msg.edit({ 
                    embeds: [finalIskenderEmbed], 
                    components: disabledRows,
                    // Yerel dosyayı mesajın 'files' bölümüne ekliyoruz
                    files: [{ attachment: './assets/iskender.png', name: 'iskender.png' }] 
                });
                return;
            } else {
                // Malzeme ekleme/çıkarma
                const ingredientKey = i.customId.replace('iskender_', '');
                if (choices[ingredientKey]) {
                    choices[ingredientKey].added = !choices[ingredientKey].added; // Seçimi tersine çevir
                }
            }

            // Mesajı yeni durumla güncelle
            const newRows = getIskenderActionRow(choices, sosEklendi);
            await msg.edit({ 
                embeds: [getIskenderEmbed(choices, sosEklendi)], 
                components: newRows
            });
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('⏳ Zaman Aşımı')
                    .setDescription('İskender yapma süresi doldu. Yağ soğudu!');

                // Zaman aşımı durumunda butonları devre dışı bırakıp mesajı güncelle
                const disabledRows = getIskenderActionRow(choices, sosEklendi, true);
                await msg.edit({ embeds: [timeoutEmbed], components: disabledRows }).catch(() => {});
            }
        });

    } catch (err) {
        console.error('İskender komutu hatası:', err);
        message.channel.send('⚠️ | İskender hazırlama sırasında beklenmedik bir hata oluştu.');
    }
};

module.exports.conf = { aliases: ['iskenderkebab', 'kebab'] };
module.exports.help = { name: 'iskender' };
