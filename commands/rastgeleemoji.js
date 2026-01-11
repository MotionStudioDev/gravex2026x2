const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const moment = require('moment');
require('moment/locale/tr');

// Kullanıcı başına favori emojiler
const userFavorites = new Map();

module.exports.run = async (client, message, args) => {
    const allEmojis = client.emojis.cache.map(e => e);
    if (allEmojis.length === 0) return message.reply('❌ Sistemde görüntülenebilir emoji bulunamadı.');

    const userId = message.author.id;
    if (!userFavorites.has(userId)) userFavorites.set(userId, []);

    const buildEmojiEmbed = (emoji) => {
        const isFavorite = userFavorites.get(userId).includes(emoji.id);
        return new EmbedBuilder()
            .setColor(isFavorite ? '#E91E63' : '#1A1C21')
            .setAuthor({
                name: `${client.guilds.cache.size} Sunucu | ${allEmojis.length} Emoji`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTitle(`${isFavorite ? '⭐' : '✨'} ${emoji.name}`)
            .setURL(emoji.url)
            .addFields(
                { name: '📂 Bilgi', value: `> **ID:** \`${emoji.id}\`\n> **Durum:** ${isFavorite ? '⭐ Favoride' : '➖ Favoride değil'}`, inline: true },
                { name: '🌐 Sunucu', value: `> **${emoji.guild.name}**\n> ${emoji.animated ? '🎬 Hareketli' : '🖼️ Sabit'}`, inline: true },
                { name: '📅 Tarih', value: `${moment(emoji.createdAt).format('DD MMMM YYYY')}\n(${moment(emoji.createdAt).fromNow()})`, inline: false }
            )
            .setImage(emoji.url)
            .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
    };

    let activeEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];

    const getButtons = () => {
        const isFavorite = userFavorites.get(userId).includes(activeEmoji.id);
        return [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('next').setLabel('Yenisini Bul').setStyle(ButtonStyle.Primary).setEmoji('🎲'),
                new ButtonBuilder().setCustomId('add').setLabel('Sunucuma Ekle').setStyle(ButtonStyle.Success).setEmoji('📥'),
                new ButtonBuilder().setCustomId('fav').setLabel(isFavorite ? 'Favoriden Çıkar' : 'Favoriye Ekle').setStyle(isFavorite ? ButtonStyle.Danger : ButtonStyle.Secondary).setEmoji('⭐'),
                new ButtonBuilder().setLabel('URL').setStyle(ButtonStyle.Link).setURL(activeEmoji.url).setEmoji('🔗')
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bulk').setLabel('Toplu Ekle').setStyle(ButtonStyle.Primary).setEmoji('📦'),
                new ButtonBuilder().setCustomId('close').setLabel('Kapat').setStyle(ButtonStyle.Danger).setEmoji('❌')
            )
        ];
    };

    const mainMessage = await message.channel.send({
        embeds: [buildEmojiEmbed(activeEmoji)],
        components: getButtons()
    });

    const collector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === userId,
        time: 180000 // 3 dakika
    });

    collector.on('collect', async i => {
        try {
            // Yeni emoji
            if (i.customId === 'next') {
                activeEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
                await i.update({ embeds: [buildEmojiEmbed(activeEmoji)], components: getButtons() });
            }

            // Favoriye ekle/çıkar
            if (i.customId === 'fav') {
                const favorites = userFavorites.get(userId);
                const index = favorites.indexOf(activeEmoji.id);
                if (index > -1) {
                    favorites.splice(index, 1);
                    await i.reply({ content: `⭐ ${activeEmoji.name} favorilerden çıkarıldı.`, flags: [MessageFlags.Ephemeral] });
                } else {
                    favorites.push(activeEmoji.id);
                    await i.reply({ content: `⭐ ${activeEmoji.name} favorilere eklendi!`, flags: [MessageFlags.Ephemeral] });
                }
                await mainMessage.edit({ embeds: [buildEmojiEmbed(activeEmoji)], components: getButtons() });
            }

            // Emoji ekle
            if (i.customId === 'add') {
                if (!i.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
                    return i.reply({ content: '❌ `İfadeleri Yönet` yetkisine ihtiyacınız var.', flags: [MessageFlags.Ephemeral] });
                }

                const modal = new ModalBuilder().setCustomId('add_modal').setTitle('Emoji Ekle');
                const nameInput = new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('Emoji adı:')
                    .setStyle(TextInputStyle.Short)
                    .setValue(activeEmoji.name)
                    .setMaxLength(32)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ time: 30000 }).catch(() => null);
                if (submitted) {
                    const name = submitted.fields.getTextInputValue('name');
                    try {
                        const created = await i.guild.emojis.create({ attachment: activeEmoji.url, name });
                        await submitted.reply({ content: `✅ ${created} başarıyla eklendi!`, flags: [MessageFlags.Ephemeral] });
                    } catch (err) {
                        let msg = '❌ Hata: ';
                        if (err.code === 30008) msg += 'Emoji limiti doldu.';
                        else if (err.code === 50035) msg += 'Geçersiz isim.';
                        else if (err.code === 50013) msg += 'Yetki hatası.';
                        else msg += err.message;
                        await submitted.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
                    }
                }
            }

            // Toplu ekle
            if (i.customId === 'bulk') {
                if (!i.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
                    return i.reply({ content: '❌ `İfadeleri Yönet` yetkisine ihtiyacınız var.', flags: [MessageFlags.Ephemeral] });
                }

                const modal = new ModalBuilder().setCustomId('bulk_modal').setTitle('Toplu Emoji Ekle');
                const countInput = new TextInputBuilder()
                    .setCustomId('count')
                    .setLabel('Kaç emoji eklensin? (1-10)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('5')
                    .setValue('5')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(countInput));
                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ time: 30000 }).catch(() => null);
                if (submitted) {
                    const count = parseInt(submitted.fields.getTextInputValue('count'));
                    if (isNaN(count) || count < 1 || count > 10) {
                        return submitted.reply({ content: '❌ 1-10 arası bir sayı girin.', flags: [MessageFlags.Ephemeral] });
                    }

                    await submitted.reply({ content: `⏳ ${count} emoji ekleniyor...`, flags: [MessageFlags.Ephemeral] });

                    let success = 0, failed = 0;

                    for (let j = 0; j < count; j++) {
                        const emoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
                        try {
                            await i.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
                            success++;
                        } catch { failed++; }
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    await submitted.followUp({ content: `✅ Tamamlandı!\n> Başarılı: ${success}\n> Başarısız: ${failed}`, flags: [MessageFlags.Ephemeral] });
                }
            }

            // Kapat
            if (i.customId === 'close') {
                await mainMessage.delete().catch(() => null);
                collector.stop();
            }

        } catch (error) {
            console.error('Emoji hatası:', error);
            const msg = '❌ Bir hata oluştu.';
            if (i.deferred || i.replied) await i.followUp({ content: msg, flags: [MessageFlags.Ephemeral] }).catch(() => null);
            else await i.reply({ content: msg, flags: [MessageFlags.Ephemeral] }).catch(() => null);
        }
    });

    collector.on('end', () => {
        mainMessage.edit({ components: [] }).catch(() => null);
    });
};

module.exports.conf = { aliases: ['re', 'e'] };
module.exports.help = { name: 'rastgele-emoji', description: 'Emoji bul ve ekle', usage: 'emoji' };
