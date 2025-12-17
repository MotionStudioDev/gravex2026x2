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

module.exports = async (client, interaction) => {
    // 🛡️ GÜVENLİK KONTROLÜ
    if (interaction.replied || interaction.deferred) return;
    // Sadece Buton ve Modal işlemlerini dinle
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    // =========================================================
    // 1. TICKET SİSTEMİ: BUTON İŞLEMLERİ
    // =========================================================

    // Ticket Açma Modalı
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

    // Ticket Üstlenme (Claim)
    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
        const ticketData = await TicketModel.findOne({ channelId: interaction.channelId });
       
        if (!ticketData) {
            return interaction.reply({ content: '❌ Bu bilet veritabanında bulunamadı.', ephemeral: true });
        }

        const currentEmbed = interaction.message.embeds[0];
        const newEmbed = EmbedBuilder.from(currentEmbed)
            .addFields({ name: '✅ Üstlenen Yetkili', value: `${interaction.user}`, inline: false })
            .setColor('Blue');

        const oldRow = interaction.message.components[0];
        const newRow = ActionRowBuilder.from(oldRow);
       
        // Üstlen butonunu devre dışı bırak
        newRow.components[0].setDisabled(true).setLabel('Üstlenildi').setStyle(ButtonStyle.Secondary);

        await interaction.update({ embeds: [newEmbed], components: [newRow] });
        return interaction.followUp({ content: `🔔 **${interaction.user.tag}** adlı yetkili bu talebi devraldı.` });
    }

    // Sesli Destek Kanalı Oluşturma
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

    // Ticket Kapatma (Sesli Kanal Dahil Her Şeyi Silen Kısım) - DÜZELTİLDİ
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 Talep sonlandırılıyor, bağlı tüm kanallar 5 saniye içinde silinecek...');

        const currentChannel = interaction.channel;
        const parentId = currentChannel.parentId;

        // Ticket verisini çek (userId burada önemli)
        const ticketData = await TicketModel.findOne({ channelId: currentChannel.id });

        await TicketModel.updateOne({ channelId: currentChannel.id }, { status: 'closed' });

        setTimeout(async () => {
            try {
                let voiceChannelToDelete = null;

                if (ticketData && ticketData.userId) {
                    // Ticket sahibinin güncel username'ini al
                    const ticketOwner = await client.users.fetch(ticketData.userId).catch(() => null);
                    const usernameLower = ticketOwner ? ticketOwner.username.toLowerCase() : null;

                    if (usernameLower) {
                        voiceChannelToDelete = interaction.guild.channels.cache.find(c =>
                            c.type === ChannelType.GuildVoice &&
                            c.parentId === parentId &&
                            c.name === `🔊-${usernameLower}` // Discord kanal isimlerini lowercase + tire ile saklar
                        );
                    }
                }

                // Eğer hala bulamadıysa fallback: kanal adından tahmin et
                if (!voiceChannelToDelete) {
                    const fallbackName = currentChannel.name.replace(/^talep-/, '🔊-').toLowerCase();
                    voiceChannelToDelete = interaction.guild.channels.cache.find(c =>
                        c.type === ChannelType.GuildVoice &&
                        c.parentId === parentId &&
                        c.name.toLowerCase() === fallbackName
                    );
                }

                if (voiceChannelToDelete) {
                    await voiceChannelToDelete.delete().catch(err => console.log('Sesli kanal silinirken hata:', err));
                    console.log(`Sesli kanal silindi: ${voiceChannelToDelete.name} (${voiceChannelToDelete.id})`);
                } else {
                    console.log('Sesli kanal bulunamadı veya zaten yok.');
                }

                await currentChannel.delete().catch(err => console.log('Text kanal silinirken hata:', err));
            } catch (err) {
                console.log("Kanal Silme Hatası:", err);
            }
        }, 5000);

        return;
    }

    // =========================================================
    // 2. TICKET SİSTEMİ: FORM GÖNDERİMİ (MODAL SUBMIT)
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
                status: 'open'
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
           
            return interaction.editReply({ content: `✅ Talebiniz başarıyla açıldı: ${ticketChannel}` });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '❌ Bilet oluşturulurken teknik bir hata meydana geldi.' });
        }
    }

    // =========================================================
    // 3. BOTLİST SİSTEMİ: BAŞVURU MODALI VE FORM GÖNDERİMİ
    // =========================================================
   
    // Bot Başvuru Modalı Açılışı
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

    // Bot Başvuru Formu Submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_bot_modal') {
        await interaction.deferReply({ ephemeral: true });
        const botId = interaction.fields.getTextInputValue('bot_id');
        const botPrefix = interaction.fields.getTextInputValue('bot_prefix');
        const botDesc = interaction.fields.getTextInputValue('bot_short_desc');
        const botInvite = interaction.fields.getTextInputValue('bot_invite_url');

        try {
            const fetchedBot = await client.users.fetch(botId).catch(() => null);
            if (!fetchedBot || !fetchedBot.bot) return interaction.editReply('❌ Girdiğiniz ID bir bot hesabı değil.');

            await BotModel.findOneAndUpdate(
                { botId: botId },
                { ownerId: interaction.user.id, prefix: botPrefix, shortDescription: botDesc, inviteUrl: botInvite, status: 'Pending', addedAt: Date.now() },
                { upsert: true }
            );

            const botSettings = await BotlistSettings.findOne({ guildId: interaction.guildId });
            const logChannel = client.channels.cache.get(botSettings?.logChannelId);

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle('🚨 Yeni Bot Başvurusu')
                    .setThumbnail(fetchedBot.displayAvatarURL())
                    .addFields(
                        { name: 'Bot Bilgisi', value: `${fetchedBot.tag} (\`${botId}\`)`, inline: true },
                        { name: 'Sahip', value: `${interaction.user}`, inline: true },
                        { name: 'Prefix', value: `\`${botPrefix}\``, inline: true },
                        { name: 'Açıklama', value: botDesc }
                    )
                    .setTimestamp();

                const logButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`approve_${botId}`).setLabel('Onayla').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`deny_${botId}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
                );

                await logChannel.send({ embeds: [logEmbed], components: [logButtons] });
                return interaction.editReply('✅ Başvurunuz başarıyla kaydedildi ve yetkililere iletildi.');
            } else {
                return interaction.editReply('❌ Sistem hatası: Log kanalı ayarlanmamış.');
            }
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ Başvuru sırasında bir hata oluştu.');
        }
    }

    // =========================================================
    // 4. BOT ONAY / RED VE MANUEL KİLİT SİSTEMİ
    // =========================================================
   
    // Bot Onayla veya Reddet Butonları
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

    // Manuel Kanal Kilidi Açma Butonu
    if (interaction.isButton() && interaction.customId.startsWith('unlock_manual_')) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Yetkiniz yetersiz.', ephemeral: true });
        }

        const targetChannelId = interaction.customId.split('_')[2];
        const targetChannel = interaction.guild.channels.cache.get(targetChannelId);

        if (targetChannel) {
            await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
            const successEmbed = new EmbedBuilder().setColor('Blue').setTitle('🔓 Kanal Kilidi Açıldı').setDescription(`Bu kanal ${interaction.user} tarafından tekrar açıldı.`);
            await interaction.update({ embeds: [successEmbed], components: [] });
        } else {
            return interaction.reply({ content: '❌ Kanal bulunamadı veya silinmiş.', ephemeral: true });
        }
    }
};
