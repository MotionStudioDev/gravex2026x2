const {
    ChannelType,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType
} = require('discord.js');

const TicketModel = require('../models/Ticket');
const TicketSettings = require('../models/TicketSettings');
const BotModel = require('../models/Bot');
const BotlistSettings = require('../models/BotlistSettings');

// Otomatik kapanma süresi: 15 dakika
const AUTO_CLOSE_TIMEOUT = 15 * 60 * 1000;

module.exports = async (client, interaction) => {
    if (interaction.replied || interaction.deferred) return;
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    // =========================================================
    // YETKİLİ ROL KONTROL FONKSİYONU
    // =========================================================
    const getStaffRoleCheck = async () => {
        const settings = await TicketSettings.findOne({ guildId: interaction.guildId });
        if (!settings?.staffRoleId) return { allowed: false, message: '❌ Sistem ayarları eksik: Yetkili rol tanımlanmamış.', settings: null };
        const hasRole = interaction.member.roles.cache.has(settings.staffRoleId);
        return { allowed: hasRole, settings };
    };

    // =========================================================
    // TICKET KAPATMA FONKSİYONU (LOG + TRANSCRIPT + SİLME)
    // =========================================================
    const closeTicket = async (channel, reason = 'Manuel kapatılma', closer = null) => {
        const ticketData = await TicketModel.findOne({ channelId: channel.id });
        if (!ticketData) return;

        await TicketModel.updateOne({ channelId: channel.id }, { status: 'closed' });

        // Timer'ı temizle
        if (client.ticketTimeouts?.[channel.id]) {
            clearTimeout(client.ticketTimeouts[channel.id]);
            delete client.ticketTimeouts[channel.id];
        }

        const settings = await TicketSettings.findOne({ guildId: channel.guild.id });
        const logChannel = settings?.logChannelId ? channel.guild.channels.cache.get(settings.logChannelId) : null;

        // Son mesajları transcript olarak al
        let transcript = 'Mesaj bulunamadı.';
        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (messages) {
            const relevant = messages
                .filter(m => !m.author.bot || m.author.id === client.user.id)
                .reverse()
                .slice(0, 20);
            transcript = relevant.map(m =>
                `[${new Date(m.createdTimestamp).toLocaleString('tr-TR')}] ${m.author.tag}: ${m.content || '(Medya/Dosya)'}${m.attachments.size > 0 ? ' [Dosya]' : ''}`
            ).join('\n');
            if (transcript.length > 1000) transcript = transcript.substring(0, 1000) + '\n... (devamı kesildi)';
        }

        const closeEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('🔒 Ticket Kapatıldı')
            .addFields(
                { name: 'Kullanıcı', value: `<@${ticketData.userId}> (${ticketData.userId})`, inline: true },
                { name: 'Konu', value: ticketData.topic || 'Belirtilmemiş', inline: true },
                { name: 'Kapatılma Nedeni', value: reason, inline: false },
                { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: 'Grave Ticket Sistemi' })
            .setTimestamp();

        if (closer) closeEmbed.addFields({ name: 'Kapatmayı Gerçekleştiren', value: `${closer}`, inline: true });

        if (logChannel) {
            await logChannel.send({
                embeds: [closeEmbed],
                content: transcript ? '**Son Mesajlar:**\n```' + transcript + '```' : null
            }).catch(() => console.log('Log gönderilemedi.'));
        }

        await channel.send('🔒 Bu ticket 5 saniye içinde silinecek...').catch(() => {});

        setTimeout(async () => {
            try {
                let voiceChannelToDelete = null;
                if (ticketData.userId) {
                    const ticketOwner = await client.users.fetch(ticketData.userId).catch(() => null);
                    if (ticketOwner) {
                        voiceChannelToDelete = channel.guild.channels.cache.find(c =>
                            c.type === ChannelType.GuildVoice &&
                            c.parentId === channel.parentId &&
                            c.name.toLowerCase() === `🔊-${ticketOwner.username.toLowerCase()}`
                        );
                    }
                }
                if (voiceChannelToDelete) await voiceChannelToDelete.delete().catch(() => {});
                await channel.delete().catch(() => {});
            } catch (err) {
                console.log("Kapatma sırasında hata:", err);
            }
        }, 5000);
    };

    // =========================================================
    // 1. TICKET SİSTEMİ: BUTON İŞLEMLERİ
    // =========================================================
    if (interaction.isButton() && interaction.customId === 'open_ticket_modal') {
        const modal = new ModalBuilder()
            .setCustomId('submit_ticket_modal')
            .setTitle('🎫 Destek Talep Formu');

        const topicInput = new TextInputBuilder()
            .setCustomId('ticket_topic')
            .setLabel('Konu Başlığı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Örn: Şikayet, Öneri, Teknik Destek')
            .setMaxLength(100);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('Detaylı Açıklama')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Lütfen sorununuzu detaylıca açıklayın...')
            .setMinLength(10)
            .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(topicInput),
            new ActionRowBuilder().addComponents(descriptionInput)
        );

        await interaction.showModal(modal).catch(e => console.log('Modal Hatası:', e));
        return;
    }

    // Üstlen - Sadece Yetkili
    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
        const check = await getStaffRoleCheck();
        if (!check.allowed) {
            return interaction.reply({ content: '❌ Bu butonu sadece **destek ekibi** kullanabilir!', ephemeral: true });
        }
        const ticketData = await TicketModel.findOne({ channelId: interaction.channelId });
        if (!ticketData) return interaction.reply({ content: '❌ Bu bilet veritabanında bulunamadı.', ephemeral: true });

        const currentEmbed = interaction.message.embeds[0];
        const newEmbed = EmbedBuilder.from(currentEmbed)
            .addFields({ name: '✅ Üstlenen Yetkili', value: `${interaction.user}`, inline: false })
            .setColor('Blue');

        const oldRow = interaction.message.components[0];
        const newRow = ActionRowBuilder.from(oldRow);
        newRow.components[0].setDisabled(true).setLabel('Üstlenildi').setStyle(ButtonStyle.Secondary);

        await interaction.update({ embeds: [newEmbed], components: [newRow] });
        await interaction.followUp({ content: `🔔 **${interaction.user.tag}** adlı yetkili bu talebi devraldı.` });
        return;
    }

    // Sesli Kanal Oluştur
    if (interaction.isButton() && interaction.customId === 'voice_support') {
        await interaction.deferReply({ ephemeral: true });
        try {
            const voiceChannel = await interaction.guild.channels.create({
                name: `🔊-${interaction.user.username}`,
                type: ChannelType.GuildVoice,
                parent: interaction.channel.parentId,
                permissionOverwrites: interaction.channel.permissionOverwrites.cache.map(p => p)
            });
            return interaction.editReply({ content: `✅ Sesli kanal başarıyla oluşturuldu: ${voiceChannel}` });
        } catch (e) {
            console.error(e);
            return interaction.editReply({ content: '❌ Sesli kanal oluşturulurken bir yetki hatası oluştu.' });
        }
    }

    // Kapat - Sadece Yetkili
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        const check = await getStaffRoleCheck();
        if (!check.allowed) {
            return interaction.reply({ content: '❌ Bu butonu sadece **destek ekibi** kullanabilir!', ephemeral: true });
        }
        await interaction.reply('🔒 Talep sonlandırılıyor...');
        await closeTicket(interaction.channel, 'Yetkili tarafından manuel kapatıldı', interaction.user);
        return;
    }

    // =========================================================
    // 2. TICKET MODAL SUBMIT
    // =========================================================
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_ticket_modal') {
        await interaction.deferReply({ ephemeral: true });
        const topic = interaction.fields.getTextInputValue('ticket_topic');
        const desc = interaction.fields.getTextInputValue('ticket_description');

        try {
            const settings = await TicketSettings.findOne({ guildId: interaction.guildId });
            const ticketChannel = await interaction.guild.channels.create({
                name: `talep-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: settings?.categoryId || null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
                    { id: settings?.staffRoleId || interaction.guild.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            await TicketModel.create({
                guildId: interaction.guildId,
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                topic: topic,
                description: desc,
                status: 'open',
                lastActivity: Date.now()
            });

            const ticketEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle(`📝 Yeni Destek Talebi: ${topic}`)
                .addFields(
                    { name: 'Kullanıcı', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                    { name: 'Konu', value: topic, inline: true },
                    { name: 'Açıklama', value: desc }
                )
                .setFooter({ text: 'Grave Destek Sistemi' })
                .setTimestamp();

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Üstlen').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('voice_support').setLabel('Sesli').setStyle(ButtonStyle.Primary).setEmoji('🔊'),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            const staffMention = settings?.staffRoleId ? `<@&${settings.staffRoleId}>` : '@everyone';
            await ticketChannel.send({ content: `${interaction.user} | ${staffMention}`, embeds: [ticketEmbed], components: [actionRow] });

            // Otomatik kapanma timer
            if (!client.ticketTimeouts) client.ticketTimeouts = {};
            client.ticketTimeouts[ticketChannel.id] = setTimeout(async () => {
                const stillOpen = await TicketModel.findOne({ channelId: ticketChannel.id, status: 'open' });
                if (stillOpen && ticketChannel.deletable) {
                    await ticketChannel.send('⏰ Uzun süredir yanıt gelmediği için bu ticket otomatik olarak kapatılıyor...');
                    await closeTicket(ticketChannel, 'Otomatik kapanma: 15 dakika yanıt gelmedi');
                }
            }, AUTO_CLOSE_TIMEOUT);

            return interaction.editReply({ content: `✅ Talebiniz başarıyla açıldı: ${ticketChannel}` });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '❌ Bilet oluşturulurken teknik bir hata meydana geldi.' });
        }
    }

    // =========================================================
    // 3. BOTLİST SİSTEMİ: BAŞVURU MODALI VE SUBMIT (ANA FIX BURADA)
    // =========================================================
    if (interaction.isButton() && interaction.customId === 'open_bot_submit_modal') {
        const botModal = new ModalBuilder().setCustomId('submit_bot_modal').setTitle('🤖 Bot Başvuru Formu');

        const bId = new TextInputBuilder().setCustomId('bot_id').setLabel('Bot ID').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(17).setMaxLength(20);
        const bPre = new TextInputBuilder().setCustomId('bot_prefix').setLabel('Prefix').setStyle(TextInputStyle.Short).setRequired(true);
        const bDesc = new TextInputBuilder().setCustomId('bot_short_desc').setLabel('Kısa Açıklama').setStyle(TextInputStyle.Short).setRequired(true);
        const bInv = new TextInputBuilder().setCustomId('bot_invite_url').setLabel('Davet Linki (0 Perm)').setStyle(TextInputStyle.Short).setRequired(true);

        botModal.addComponents(
            new ActionRowBuilder().addComponents(bId),
            new ActionRowBuilder().addComponents(bPre),
            new ActionRowBuilder().addComponents(bDesc),
            new ActionRowBuilder().addComponents(bInv)
        );

        await interaction.showModal(botModal).catch(e => console.log('BotModal Hatası:', e));
        return;
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_bot_modal') {
        await interaction.deferReply({ ephemeral: true });

        const botId = interaction.fields.getTextInputValue('bot_id');
        const botPrefix = interaction.fields.getTextInputValue('bot_prefix');
        const botDesc = interaction.fields.getTextInputValue('bot_short_desc');
        const botInvite = interaction.fields.getTextInputValue('bot_invite_url');

        try {
            const fetchedBot = await client.users.fetch(botId).catch(() => null);
            if (!fetchedBot || !fetchedBot.bot) {
                return interaction.editReply({ content: '❌ Girdiğiniz ID bir bot hesabı değil.' });
            }

            // CRASH ÖNLEYİCİ FIX: longDescription default olarak ekleniyor
            await BotModel.findOneAndUpdate(
                { botId },
                {
                    $set: {
                        ownerId: interaction.user.id,
                        prefix: botPrefix,
                        shortDescription: botDesc,
                        inviteUrl: botInvite,
                        status: 'Pending'
                    },
                    $setOnInsert: {
                        addedAt: Date.now(),
                        longDescription: 'Uzun açıklama henüz eklenmemiştir.'
                    }
                },
                { upsert: true, setDefaultsOnInsert: true }
            );

            const botSettings = await BotlistSettings.findOne({ guildId: interaction.guildId });
            const logChannel = botSettings?.logChannelId ? interaction.guild.channels.cache.get(botSettings.logChannelId) : null;

            if (!logChannel) {
                return interaction.editReply({ content: '❌ Log kanalı ayarlanmamış. Yöneticiye bildir.' });
            }

            const logEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('🚨 Yeni Bot Başvurusu')
                .setThumbnail(fetchedBot.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Bot', value: `${fetchedBot.tag} (\`${botId}\`)`, inline: true },
                    { name: 'Sahip', value: `${interaction.user}`, inline: true },
                    { name: 'Prefix', value: `\`${botPrefix}\``, inline: true },
                    { name: 'Kısa Açıklama', value: botDesc, inline: false },
                    { name: 'Davet Linki', value: `[Davet Et](${botInvite})`, inline: false }
                )
                .setTimestamp();

            const logButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`approve_${botId}`).setLabel('Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`deny_${botId}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ embeds: [logEmbed], components: [logButtons] });
            return interaction.editReply({ content: '✅ Bot başvurunuz başarıyla alındı ve incelemeye gönderildi!' });

        } catch (err) {
            console.error('Bot başvuru hatası:', err);
            return interaction.editReply({ content: '❌ Başvuru sırasında bir hata oluştu. Lütfen tekrar deneyin.' });
        }
    }

    // =========================================================
    // 4. BOT ONAY / REDDET VE MANUEL KİLİT AÇMA
    // =========================================================
    if (interaction.isButton() && (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('deny_'))) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Bu işlemi sadece yöneticiler yapabilir.', ephemeral: true });
        }

        const [actionType, targetBotId] = interaction.customId.split('_');
        const dbBot = await BotModel.findOne({ botId: targetBotId });
        if (!dbBot) return interaction.reply({ content: '❌ Bu botun verileri bulunamadı.', ephemeral: true });

        const botAccount = await client.users.fetch(targetBotId).catch(() => null);
        const botOwner = await client.users.fetch(dbBot.ownerId).catch(() => null);

        if (actionType === 'approve') {
            dbBot.status = 'Approved';
            await dbBot.save();
            if (botOwner) botOwner.send(`✅ Tebrikler! **${botAccount?.tag || 'Botunuz'}** sunucumuzda onaylandı.`).catch(() => {});
            await interaction.update({ content: `✅ **${botAccount?.tag}** başarıyla onaylandı. Onaylayan: ${interaction.user}`, components: [], embeds: [] });
        } else {
            dbBot.status = 'Denied';
            await dbBot.save();
            if (botOwner) botOwner.send(`❌ Üzgünüz, **${botAccount?.tag || 'Botunuz'}** başvurusu reddedildi.`).catch(() => {});
            await interaction.update({ content: `❌ **${botAccount?.tag}** başvurusu reddedildi. Reddeden: ${interaction.user}`, components: [], embeds: [] });
        }
    }

    // Manuel Kanal Kilidi Açma
    if (interaction.isButton() && interaction.customId.startsWith('unlock_manual_')) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Yetkiniz yetersiz.', ephemeral: true });
        }

        const targetChannelId = interaction.customId.split('_')[2];
        const targetChannel = interaction.guild.channels.cache.get(targetChannelId);

        if (targetChannel) {
            await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
            const successEmbed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('🔓 Kanal Kilidi Açıldı')
                .setDescription(`Bu kanal ${interaction.user} tarafından tekrar açıldı.`);

            await interaction.update({ embeds: [successEmbed], components: [] });
        } else {
            return interaction.reply({ content: '❌ Kanal bulunamadı veya silinmiş.', ephemeral: true });
        }
    }
};
