const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField, 
    ChannelType 
} = require('discord.js');
const TicketSettings = require('../models/TicketSettings');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.');
    }

    const existing = await TicketSettings.findOne({ guildId: message.guildId });

    if (existing) {
        const embed = new EmbedBuilder()
            .setColor('Orange')
            .setTitle('⚠️ Bilet Sistemi Zaten Var!')
            .setDescription('Sunucunda zaten bir bilet sistemi kurulu. Yeniden kurmak istersen onay ver, yoksa iptal et.')
            .addFields(
                { name: 'Kategori', value: `<#${existing.categoryId}>`, inline: true },
                { name: 'Yetkili Rol', value: `<@&${existing.staffRoleId}>`, inline: true },
                { name: 'Log Kanalı', value: existing.logChannelId ? `<#${existing.logChannelId}>` : 'Yok', inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reinstall_yes').setLabel('Yeniden Kur').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('reinstall_no').setLabel('İptal').setStyle(ButtonStyle.Danger)
        );

        const confirmMsg = await message.reply({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === message.author.id;
        const collector = confirmMsg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'reinstall_no') {
                await i.update({ embeds: [new EmbedBuilder().setColor('Grey').setDescription('❌ Yeniden kurulum iptal edildi.')], components: [] });
            } else {
                await i.deferUpdate();
                await TicketSettings.deleteOne({ guildId: message.guildId });
                await startWizard(i);
            }
            collector.stop();
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                confirmMsg.edit({ embeds: [new EmbedBuilder().setColor('Orange').setDescription('⏰ Süre doldu, işlem iptal edildi.')], components: [] }).catch(() => {});
            }
        });
        return;
    }

    // Yeni kurulum
    await startWizard(message);
};

async function startWizard(msgOrInt) {
    const isInt = msgOrInt.deferred !== undefined;
    const replyFunc = async (content) => isInt ? await msgOrInt.editReply(content) : await msgOrInt.reply(content);

    let categoryId, staffRoleId, logChannelId = null;

    const startEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🎫 Bilet Sistemi Kurulum Sihirbazı')
        .setDescription(
            '**Adım adım ayarları yapalım!**\n\n' +
            '1️⃣ Önce **talep kategorisi ID**\'sini gönder (talepler bu kategoride açılacak)\n' +
            '2️⃣ Sonra **yetkili rol ID**\'sini gönder (üstlenip kapatabilecek rol)\n' +
            '3️⃣ En son **log kanalı ID**\'sini gönder (kapanan ticketler buraya düşecek - isteğe bağlı, geçmek için "yok" yaz)\n\n' +
            '**İptal etmek için alttaki butona basabilirsin.**'
        );

    const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wizard_cancel')
            .setLabel('Kurulumu İptal Et')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );

    const wizardMsg = await replyFunc({ embeds: [startEmbed], components: [cancelRow] });

    const filter = m => m.author.id === msgOrInt.author.id;
    const collector = msgOrInt.channel.createMessageCollector({ filter, time: 300000, max: 3 });

    // İptal butonu
    const buttonCollector = wizardMsg.createMessageComponentCollector({ time: 300000 });
    buttonCollector.on('collect', async i => {
        if (i.customId === 'wizard_cancel' && i.user.id === msgOrInt.author.id) {
            await i.update({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Kurulum iptal edildi.')], components: [] });
            collector.stop();
            buttonCollector.stop();
        }
    });

    collector.on('collect', async m => {
        await m.delete().catch(() => {});

        if (collector.collected.size === 1) {
            // Kategori ID
            const id = m.content.trim();
            if (!/^\d{17,19}$/.test(id)) {
                await m.channel.send('❌ Geçersiz kategori ID. Lütfen doğru bir ID gir.').then(x => setTimeout(() => x.delete().catch(() => {}), 5000));
                collector.stop();
                return;
            }
            try {
                const channel = await m.guild.channels.fetch(id);
                if (channel.type !== ChannelType.GuildCategory) throw new Error();
                categoryId = id;
                await m.channel.send(`✅ Kategori ayarlandı: <#${id}>\nŞimdi **yetkili rol ID**'sini gönder.`);
            } catch {
                await m.channel.send('❌ Bu ID bir kategori değil veya bulunamadı. Kurulum iptal edildi.').then(x => setTimeout(() => x.delete().catch(() => {}), 5000));
                collector.stop();
            }
        } else if (collector.collected.size === 2) {
            // Yetkili Rol ID
            const id = m.content.trim();
            if (!/^\d{17,19}$/.test(id)) {
                await m.channel.send('❌ Geçersiz rol ID.').then(x => setTimeout(() => x.delete().catch(() => {}), 5000));
                collector.stop();
                return;
            }
            try {
                const role = await m.guild.roles.fetch(id);
                staffRoleId = id;
                await m.channel.send(`✅ Yetkili rol ayarlandı: <@&${id}>\nSon olarak **log kanalı ID**'sini gönder (isteğe bağlı, geçmek için "yok" yaz).`);
            } catch {
                await m.channel.send('❌ Bu rol bulunamadı. Kurulum iptal edildi.').then(x => setTimeout(() => x.delete().catch(() => {}), 5000));
                collector.stop();
            }
        } else if (collector.collected.size === 3) {
            // Log Kanalı
            const input = m.content.trim().toLowerCase();
            if (input !== 'yok' && input !== 'geç' && input !== 'atla') {
                if (!/^\d{17,19}$/.test(input)) {
                    await m.channel.send('❌ Geçersiz kanal ID, log kanalı atlandı.');
                } else {
                    try {
                        const channel = await m.guild.channels.fetch(input);
                        if (channel.type === ChannelType.GuildText) {
                            logChannelId = input;
                            await m.channel.send(`✅ Log kanalı ayarlandı: <#${input}>`);
                        } else {
                            await m.channel.send('❌ Bu bir metin kanalı değil, log atlandı.');
                        }
                    } catch {
                        await m.channel.send('❌ Kanal bulunamadı, log atlandı.');
                    }
                }
            } else {
                await m.channel.send('ℹ️ Log kanalı ayarlanmadı.');
            }

            // Özet ve onay
            const summaryEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Ayarlar Tamamlandı!')
                .setDescription('Tüm ayarlar hazır. Paneli oluşturmak için onay ver.')
                .addFields(
                    { name: 'Talep Kategorisi', value: `<#${categoryId}>`, inline: true },
                    { name: 'Yetkili Rol', value: `<@&${staffRoleId}>`, inline: true },
                    { name: 'Log Kanalı', value: logChannelId ? `<#${logChannelId}>` : 'Yok', inline: true }
                );

            const finalRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('final_yes').setLabel('Kur ve Panel Oluştur').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('final_no').setLabel('İptal').setStyle(ButtonStyle.Danger)
            );

            await m.channel.send({ embeds: [summaryEmbed], components: [finalRow] });
            collector.stop();
        }
    });

    // Final onay butonları (event ile yakala)
    const finalCollector = msgOrInt.channel.createMessageComponentCollector({ time: 300000 });
    finalCollector.on('collect', async i => {
        if (!['final_yes', 'final_no'].includes(i.customId)) return;
        if (i.user.id !== msgOrInt.author.id) return i.reply({ content: 'Bu buton sana ait değil!', ephemeral: true });

        if (i.customId === 'final_no') {
            return i.update({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Kurulum iptal edildi.')], components: [] });
        }

        // ONAY VERİLDİ → PANEL OLUŞTUR
        await i.deferUpdate();
        const loadingEmbed = new EmbedBuilder().setColor('Yellow').setDescription('⏳ Panel oluşturuluyor, lütfen bekle...');
        const loadingMsg = await i.editReply({ embeds: [loadingEmbed], components: [] });

        const panelEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('🎫 Destek Sistemi')
            .setDescription(
                'Destek talebi oluşturmak için aşağıdaki butona tıklayın.\n\n' +
                '**Kurallar:**\n' +
                '• Gereksiz bilet açmak yasaktır\n' +
                '• Yetkilileri gereksiz etiketlemeyin\n' +
                '• Sabırlı olun, en kısa sürede dönüş yapılacaktır'
            )
            .setFooter({ text: 'Grave Ticket Sistemi' })
            .setTimestamp();

        const panelRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket_modal')
                .setLabel('Bilet Aç')
                .setEmoji('🎫')
                .setStyle(ButtonStyle.Primary)
        );

        await loadingMsg.edit({ embeds: [panelEmbed], components: [panelRow] });

        // Veritabanına kaydet
        await TicketSettings.create({
            guildId: message.guildId,
            categoryId,
            staffRoleId,
            logChannelId,
            messageId: loadingMsg.id,
            channelId: i.channel.id
        });

        await i.followUp({
            embeds: [new EmbedBuilder()
                .setColor('Green')
                .setDescription('✅ **Bilet sistemi başarıyla kuruldu!**\nArtık üyeler bilet açabilir.')
            ],
            ephemeral: true
        });
    });
}

module.exports.conf = { aliases: ['ticket-kur', 'ticket-setup'] };
module.exports.help = { name: 'ticket-sistemi' };
