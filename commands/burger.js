const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Botun ana dizininden assets klasöründeki dosyayı içe aktarmak için path modülüne ihtiyacımız var.
// Ancak Discord.js'in 'files' özelliği, Node.js'de çalışırken otomatik olarak yolu bulur,
// bu yüzden direkt olarak './assets/burger.png' kullanmak genellikle yeterlidir.

module.exports.run = async (client, message, args) => {
    try {
        const userId = message.author.id;
        
        // Burger malzemelerinin başlangıç durumu
        const choices = {
            peynir: { emoji: '🧀', label: 'Peynir', added: false },
            domates: { emoji: '🍅', label: 'Domates', added: false },
            marul: { emoji: '🥬', label: 'Marul', added: false },
            sogan: { emoji: '🧅', label: 'Soğan', added: false }
        };

        /**
         * Malzeme seçimine göre güncel Embed'i oluşturur.
         */
        const getBurgerEmbed = (currentChoices) => {
            const addedIngredients = Object.values(currentChoices)
                .filter(item => item.added)
                .map(item => item.emoji + ' ' + item.label)
                .join(', ');

            const description = addedIngredients ? 
                `Burgerinde şu an: **${addedIngredients}** var. 🤤\n\n` : 
                `Burgerine henüz hiçbir şey eklemedin. Başla! 🚀\n\n`;

            return new EmbedBuilder()
                .setColor('#FF9933')
                .setTitle('🍔 Kendi Burgerini Oluştur!')
                .setDescription(description + 'Aşağıdaki seçeneklerden burgerine eklemek istediklerini seç, sonra "Burgerini Oluştur!" butonuna tıkla.')
                .setFooter({ text: '30 saniye içinde seçim yapmalısın.' });
        };

        /**
         * Malzeme seçimine göre güncel butonları içeren ActionRow'u oluşturur.
         */
        const getBurgerActionRow = (currentChoices, disabled = false) => {
            const row = new ActionRowBuilder();
            for (const key in currentChoices) {
                const item = currentChoices[key];
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`burger_${key}`)
                        .setLabel(item.label)
                        .setEmoji(item.emoji)
                        .setStyle(item.added ? ButtonStyle.Success : ButtonStyle.Primary) // Ekliyse yeşil, değilse mavi
                        .setDisabled(disabled)
                );
            }
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('burger_create')
                    .setLabel('🍔 Burgerini Oluştur!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled)
            );
            return row;
        };
        
        const initialEmbed = getBurgerEmbed(choices);
        const initialRow = getBurgerActionRow(choices);

        const msg = await message.channel.send({ embeds: [initialEmbed], components: [initialRow] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === userId && i.customId.startsWith('burger_'),
            time: 30000
        });

        collector.on('collect', async i => {
            await i.deferUpdate(); // Hızlı yanıt veriyoruz

            if (i.customId === 'burger_create') {
                collector.stop('created'); // Burger oluşturuldu sinyalini gönder

                const selectedIngredients = Object.values(choices)
                    .filter(item => item.added)
                    .map(item => item.label)
                    .join(', ') || 'hiçbir şey';

                const finalBurgerEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🎉 İşte Burgerin Hazır!')
                    .setDescription(`Afiyet olsun, **${message.author.username}**! Burgerinde **${selectedIngredients}** var.`)
                    // Yerel dosyayı kullanmak için 'attachment://' öneki ve dosya adı kullanılır
                    .setImage('attachment://burger.png') 
                    .setFooter({ text: 'Şimdi doyma zamanı!' })
                    .setTimestamp();
                
                // Tüm butonları devre dışı bırak
                const disabledRow = getBurgerActionRow(choices, true);

                await msg.edit({ 
                    embeds: [finalBurgerEmbed], 
                    components: [disabledRow],
                    // Yerel dosyayı mesajın 'files' bölümüne ekliyoruz
                    files: [{ attachment: './assets/burger.png', name: 'burger.png' }] 
                });
                return;
            }

            // Malzeme ekleme/çıkarma
            const ingredientKey = i.customId.replace('burger_', '');
            if (choices[ingredientKey]) {
                choices[ingredientKey].added = !choices[ingredientKey].added; // Seçimi tersine çevir
            }

            // Mesajı yeni durumla güncelle
            await msg.edit({ 
                embeds: [getBurgerEmbed(choices)], 
                components: [getBurgerActionRow(choices)] 
            });
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('⏳ Zaman Aşımı')
                    .setDescription('Burger yapma süresi doldu. Bir dahaki sefere daha hızlı ol!');

                // Zaman aşımı durumunda butonları devre dışı bırakıp mesajı güncelle
                const disabledRow = getBurgerActionRow(choices, true);
                await msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
            }
        });

    } catch (err) {
        console.error('Burger komutu hatası:', err);
        message.channel.send('⚠️ | Burger oluşturma sırasında beklenmedik bir hata oluştu.');
    }
};

module.exports.conf = { aliases: ['makeburger', 'burgerim'] };
module.exports.help = { name: 'burger' };
