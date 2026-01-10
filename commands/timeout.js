const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    PermissionFlagsBits, StringSelectMenuBuilder, ModalBuilder, 
    TextInputBuilder, TextInputStyle 
} = require('discord.js');
const ms = require('ms');

module.exports.run = async (client, message, args) => {
    // --- Yardımcı Fonksiyon: Hızlı Embed ---
    const sendEmbed = (title, desc, color = '#FF4D4D') => {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: 'Grave Moderasyon Sinyali', iconURL: client.user.displayAvatarURL() })
            .setDescription(`>>> ${desc}`)
            .setFooter({ text: 'Sistem Kayıtları Aktif' });
        return { embeds: [embed], components: [] };
    };

    // 1. Yetki ve Hedef Kontrolü
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply(sendEmbed('Yetki Hatası', '❌ Bu işlem için `Üyeleri Yönet` yetkiniz bulunmalıdır.'));
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply(sendEmbed('Kullanıcı Belirle', '⚠ Bir kullanıcı belirtmelisin (Etiket veya ID).', '#FBBF24'));
    if (!target.moderatable) return message.reply(sendEmbed('Erişim Reddedildi', '❌ Bu kullanıcıya işlem yapma yetkim yok.', '#FF4D4D'));

    // 2. Ana Kontrol Paneli
    const mainEmbed = new EmbedBuilder()
        .setColor('#111827')
        .setAuthor({ name: 'Grave Moderasyon Paneli', iconURL: client.user.displayAvatarURL() })
        .setTitle(`🛠️ Ceza Katmanı: ${target.user.tag}`)
        .setDescription('Susturma işlemi için bir kategori seçin veya özel bir süre tanımlayın.')
        .addFields(
            { name: '👤 Kullanıcı', value: `${target}`, inline: true },
            { name: '🆔 ID', value: `\`${target.id}\``, inline: true }
        )
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'PenDC Altyapısına | Veri İşleniyor...' });

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('fast_timeout')
            .setPlaceholder('Hazır Susturma Kategorsini Seçin...')
            .addOptions([
                { label: 'Hafif İhlal (5 Dakika)', value: '5m', emoji: '⏲️' },
                { label: 'Orta İhlal (1 Saat)', value: '1h', emoji: '⏰' },
                { label: 'Ağır İhlal (1 Gün)', value: '1d', emoji: '🚫' },
                { label: 'Kritik İhlal (1 Hafta)', value: '1w', emoji: '💀' }
            ])
    );

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('custom_time').setLabel('Özel Süre Tanımla').setStyle(ButtonStyle.Primary).setEmoji('⌨️'),
        new ButtonBuilder().setCustomId('cancel').setLabel('İşlemi Durdur').setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({ embeds: [mainEmbed], components: [menu, buttons] });

    // 3. Kolektör
    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 60000 
    });

    collector.on('collect', async i => {
        // --- ÖZEL SÜRE MODAL ---
        if (i.customId === 'custom_time') {
            const modal = new ModalBuilder()
                .setCustomId('timeout_modal')
                .setTitle('Grave | Manuel Süre Girişi');

            const timeInput = new TextInputBuilder()
                .setCustomId('time_value')
                .setLabel("Süre Belirtin")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: 10 dakika, 2 saat, 1 gün...')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(timeInput));
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({ time: 30000 }).catch(() => null);
            if (submitted) {
                let input = submitted.fields.getTextInputValue('time_value');
                // Akıllı Türkçe Çeviri
                const cleanInput = input.toLowerCase()
                    .replace('dakika', 'm').replace('saat', 'h')
                    .replace('gün', 'd').replace('saniye', 's')
                    .replace('hafta', 'w');
                
                const duration = ms(cleanInput);
                if (!duration) return submitted.reply(sendEmbed('Format Hatası', '❌ Geçersiz zaman formatı girdiniz!', '#FF4D4D'));
                
                await target.timeout(duration, `GraveBOT: ${message.author.tag} tarafından.`);
                await submitted.reply(sendEmbed('İşlem Başarılı', `✅ **${target.user.tag}** kullanıcısı **${input}** süreliğine susturuldu.`, '#3DD687'));
                msg.delete().catch(() => null);
            }
        }

        // --- MENÜ SEÇİMİ ---
        if (i.isStringSelectMenu()) {
            const selectedTime = i.values[0];
            const duration = ms(selectedTime);
            
            await target.timeout(duration, `GraveBOT Hızlı Susturma: ${message.author.tag}`);
            await i.update(sendEmbed('Susturma Tamamlandı', `✅ **${target.user.tag}** susturuldu.\nSüre: **${selectedTime}**`, '#3DD687'));
        }

        // --- İPTAL ---
        if (i.customId === 'cancel') {
            await i.update(sendEmbed('İptal Edildi', '❌ Moderasyon işlemi kullanıcı isteğiyle durduruldu.', '#94A3B8'));
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && msg) msg.delete().catch(() => null);
    });
};

module.exports.conf = { aliases: ['ceza', 'to', 'sustur'] };
module.exports.help = { name: 'timeout' };
