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
const TicketSettings = require('../models/TicketSettings'); 
const BotModel = require('../models/Bot');
const BotlistSettings = require('../models/BotlistSettings');

module.exports = async (client, interaction) => {
    
    // Etkileşim türü kontrolü: Sadece buton ve modal submit işlemlerini işle
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) {
        return;
    }

    // =========================================================
    // 🎫 TICKET SİSTEMİ: MODAL AÇILIŞI
    // =========================================================
    if (interaction.isButton() && interaction.customId === 'open_ticket_modal') {
        
        const modal = new ModalBuilder()
            .setCustomId('submit_ticket_modal')
            .setTitle('🎫 Grave Destek Talep Formu');

        const topicInput = new TextInputBuilder()
            .setCustomId('ticket_topic')
            .setLabel('Destek Konusu/Başlığı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(100)
            .setPlaceholder('Örn: Sunucu hakkında bir sorum var.');

        const descriptionInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('Sorunun Detaylı Açıklaması')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(20)
            .setMaxLength(1000)
            .setPlaceholder('Lütfen yaşadığınız sorunu tüm detaylarıyla buraya yazınız.');

        const row1 = new ActionRowBuilder().addComponents(topicInput);
        const row2 = new ActionRowBuilder().addComponents(descriptionInput);

        modal.addComponents(row1, row2);

        try {
            return await interaction.showModal(modal);
        } catch (error) {
            console.error('[HATA] Ticket Modalı gösterilemedi:', error);
        }
    }

    // =========================================================
    // 🎫 TICKET SİSTEMİ: FORM GÖNDERİMİ VE KANAL AÇMA
    // =========================================================
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_ticket_modal') {
        
        await interaction.deferReply({ ephemeral: true });

        const ticketTopic = interaction.fields.getTextInputValue('ticket_topic');
        const ticketDescription = interaction.fields.getTextInputValue('ticket_description');
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        try {
            // Mevcut aktif bilet kontrolü
            const activeTicket = await TicketModel.findOne({ 
                guildId: guildId, 
                userId: userId, 
                status: 'open' 
            });
            
            if (activeTicket) {
                const channelExists = interaction.guild.channels.cache.get(activeTicket.channelId);
                
                if (channelExists) {
                    return interaction.editReply({ 
                        content: `❌ Halihazırda açık bir destek talebiniz bulunuyor: ${channelExists}. Yenisini açmadan önce lütfen mevcut olanı kapatınız.`,
                    });
                } else {
                    // Kanal silinmiş ama DB'de kalmışsa temizle
                    await TicketModel.deleteOne({ channelId: activeTicket.channelId });
                }
            }
            
            // Sistem ayarlarını veritabanından çek
            const ticketSettings = await TicketSettings.findOne({ guildId: guildId });
            
            // Kanal ismini normalize et
            const sanitizedTopic = ticketTopic.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
            const finalChannelName = `talep-${sanitizedTopic}`;
            
            // Ticket Kanalını Oluştur
            const ticketChannel = await interaction.guild.channels.create({
                name: finalChannelName,
                type: ChannelType.GuildText,
                parent: ticketSettings ? ticketSettings.categoryId : null,
                permissionOverwrites: [
                    { 
                        id: interaction.guild.id, 
                        deny: [PermissionsBitField.Flags.ViewChannel] 
                    }, 
                    { 
                        id: userId, 
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, 
                            PermissionsBitField.Flags.SendMessages, 
                            PermissionsBitField.Flags.AttachFiles,
                            PermissionsBitField.Flags.EmbedLinks,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ] 
                    }, 
                    { 
                        id: ticketSettings ? ticketSettings.staffRoleId : interaction.guild.id, 
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, 
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ] 
                    }
                ],
                reason: `${interaction.user.tag} için yeni bir destek kanalı açıldı.`
            });

            // Veritabanına yeni kaydı ekle
            const dbTicketEntry = new TicketModel({
                guildId: guildId,
                channelId: ticketChannel.id,
                userId: userId,
                topic: ticketTopic, 
                description: ticketDescription,
                status: 'open',
                createdAt: new Date()
            });
            await dbTicketEntry.save();

            // Hoş geldin Embed Mesajı
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(`🎫 Yeni Destek Talebi: ${ticketTopic}`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setDescription('Destek ekibimiz talebinizi aldı. En kısa sürede sizinle iletişime geçilecektir.')
                .addFields(
                    { name: '👤 Kullanıcı Bilgisi', value: `${interaction.user} (\`${userId}\`)`, inline: true },
                    { name: '📝 Konu Başlığı', value: `\`${ticketTopic}\``, inline: true },
                    { name: '📄 Detaylı Açıklama', value: `\`\`\`${ticketDescription}\`\`\`` }
                )
                .setFooter({ text: 'Grave Ticket Yönetim Paneli', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            // Aksiyon Butonları
            const controlButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('Bileti Üstlen')
                    .setEmoji('🙋‍♂️')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('voice_support')
                    .setLabel('Sesli Destek')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Talebi Kapat')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger)
            );
            
            await ticketChannel.send({ 
                content: `🚀 Bilgilendirme: ${interaction.user} | <@&${ticketSettings ? ticketSettings.staffRoleId : ''}>`, 
                embeds: [welcomeEmbed], 
                components: [controlButtons] 
            });
            
            return interaction.editReply({ 
                content: `✅ Başarılı! Destek talebiniz oluşturuldu: ${ticketChannel}` 
            });

        } catch (err) {
            console.error('[KRİTİK HATA] ModalSubmit İşleme Hatası:', err);
            return interaction.editReply({ 
                content: '❌ Maalesef biletiniz oluşturulurken bir hata ile karşılaşıldı. Lütfen yetkileri kontrol edin.' 
            });
        }
    }

    // =========================================================
    // 🎫 TICKET SİSTEMİ: BUTON AKSİYONLARI
    // =========================================================
    if (interaction.isButton()) {
        
        // BİLETİ ÜSTLENME MANTIĞI
        if (interaction.customId === 'claim_ticket') {
            const ticketCheck = await TicketModel.findOne({ channelId: interaction.channelId });
            
            if (!ticketCheck) {
                return interaction.reply({ content: '❌ Bu kanal veritabanında bilet olarak kayıtlı değil.', ephemeral: true });
            }

            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .addFields({ 
                    name: '✅ Üstlenen Yetkili', 
                    value: `${interaction.user} (\`${interaction.user.tag}\`)`, 
                    inline: false 
                })
                .setColor('#3498DB');

            const actionButtons = ActionRowBuilder.from(interaction.message.components[0]);
            actionButtons.components[0].setDisabled(true).setLabel('Bilet Üstlenildi');

            await interaction.update({ 
                embeds: [updatedEmbed], 
                components: [actionButtons] 
            });

            return interaction.followUp({ 
                content: `🔔 Bilgi: **${interaction.user.tag}** isimli yetkili bu talebi devraldı.` 
            });
        }

        // SESLİ DESTEK ODASI AÇMA
        if (interaction.customId === 'voice_support') {
            try {
                const voiceCh = await interaction.guild.channels.create({
                    name: `🔊-destek-${interaction.user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: interaction.channel.parentId,
                    permissionOverwrites: interaction.channel.permissionOverwrites.cache.map(ov => ov)
                });

                return interaction.reply({ 
                    content: `✅ Sesli destek odanız hazır: ${voiceCh}`, 
                    ephemeral: true 
                });
            } catch (err) {
                console.error('Sesli kanal oluşturulamadı:', err);
                return interaction.reply({ content: '❌ Sesli kanal oluşturma yetkim yok.', ephemeral: true });
            }
        }

        // TALEBİ KAPATMA
        if (interaction.customId === 'close_ticket') {
            const ticketVerify = await TicketModel.findOne({ channelId: interaction.channelId });
            
            if (!ticketVerify) {
                return interaction.reply({ content: '❌ Bu kanal bir destek talebi kanalı değildir.', ephemeral: true });
            }

            await interaction.reply({ 
                content: '⚠️ Destek talebi sonlandırılıyor. Kanal 5 saniye içerisinde kalıcı olarak silinecektir...' 
            });

            await TicketModel.updateOne(
                { channelId: interaction.channelId }, 
                { status: 'closed', closedAt: new Date() }
            );
            
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (e) {
                    console.error('Kanal silinemedi:', e);
                }
            }, 5000);
            return;
        }
    }

    // =========================================================
    // 🤖 BOTLİST SİSTEMİ: BAŞVURU MODALI
    // =========================================================
    if (interaction.isButton() && interaction.customId === 'open_bot_submit_modal') {
        
        const botModal = new ModalBuilder()
            .setCustomId('submit_bot_modal')
            .setTitle('🤖 Bot Listesi Başvuru Formu');

        const bId = new TextInputBuilder()
            .setCustomId('bot_id')
            .setLabel('Botun ID Adresi')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(17)
            .setMaxLength(20)
            .setPlaceholder('Botunuzun Client ID numarasını giriniz.');

        const bPrefix = new TextInputBuilder()
            .setCustomId('bot_prefix')
            .setLabel('Botun Prefixi')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(5)
            .setPlaceholder('Örn: !');

        const bDesc = new TextInputBuilder()
            .setCustomId('bot_short_desc')
            .setLabel('Kısa Tanıtım')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const bInvite = new TextInputBuilder()
            .setCustomId('bot_invite_url')
            .setLabel('Davet Bağlantısı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('OAuth2 davet linkini buraya yapıştırın.');

        botModal.addComponents(
            new ActionRowBuilder().addComponents(bId),
            new ActionRowBuilder().addComponents(bPrefix),
            new ActionRowBuilder().addComponents(bDesc),
            new ActionRowBuilder().addComponents(bInvite)
        );

        return await interaction.showModal(botModal);
    }

    // =========================================================
    // 🤖 BOTLİST SİSTEMİ: FORM DEĞERLENDİRME
    // =========================================================
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_bot_modal') {
        
        await interaction.deferReply({ ephemeral: true });

        const botIdInput = interaction.fields.getTextInputValue('bot_id');
        const prefixInput = interaction.fields.getTextInputValue('bot_prefix');
        const descInput = interaction.fields.getTextInputValue('bot_short_desc');
        const inviteInput = interaction.fields.getTextInputValue('bot_invite_url');

        try {
            const checkExisting = await BotModel.findOne({ botId: botIdInput });
            
            if (checkExisting && checkExisting.status !== 'Denied') {
                return interaction.editReply(`❌ Bu bot zaten sistemde kayıtlı. Mevcut durum: **${checkExisting.status}**`);
            }

            const fetchBotUser = await client.users.fetch(botIdInput).catch(() => null);
            
            if (!fetchBotUser || !fetchBotUser.bot) {
                return interaction.editReply('❌ Geçersiz bir Bot ID girdiniz. Lütfen Discord Developer Portal üzerinden kontrol edin.');
            }

            await BotModel.findOneAndUpdate(
                { botId: botIdInput }, 
                { 
                    ownerId: interaction.user.id, 
                    prefix: prefixInput, 
                    shortDescription: descInput, 
                    inviteUrl: inviteInput, 
                    status: 'Pending', 
                    addedAt: Date.now() 
                }, 
                { upsert: true }
            );

            const botlistConf = await BotlistSettings.findOne({ guildId: interaction.guildId });
            
            if (!botlistConf || !botlistConf.logChannelId) {
                return interaction.editReply('❌ Sunucu botlist log kanalı ayarlanmamış.');
            }

            const logCh = client.channels.cache.get(botlistConf.logChannelId);
            const submissionEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle(`🚨 Yeni Bot Başvurusu: ${fetchBotUser.tag}`)
                .setThumbnail(fetchBotUser.displayAvatarURL())
                .addFields(
                    { name: '👤 Başvuran', value: `${interaction.user} (\`${interaction.user.id}\`)` },
                    { name: '🆔 Bot ID', value: `\`${botIdInput}\``, inline: true },
                    { name: '⌨️ Prefix', value: `\`${prefixInput}\``, inline: true }
                )
                .setTimestamp();

            const logBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`approve_${botIdInput}`).setLabel('Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`deny_${botIdInput}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
            );

            await logCh.send({ embeds: [submissionEmbed], components: [logBtns] });
            return interaction.editReply(`✅ Başvurunuz başarıyla <#${logCh.id}> kanalına iletildi.`);

        } catch (e) {
            console.error('Botlist submission error:', e);
            return interaction.editReply('❌ İşlem sırasında teknik bir hata oluştu.');
        }
    }

    // =========================================================
    // 🔓 MANUEL KİLİT AÇMA SİSTEMİ
    // =========================================================
    if (interaction.isButton() && interaction.customId.startsWith('unlock_manual_')) {
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Yetkiniz yetersiz.', ephemeral: true });
        }

        const targetChannelId = interaction.customId.split('_')[2];
        const targetChannel = interaction.guild.channels.cache.get(targetChannelId);
        
        if (targetChannel) {
            try {
                await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
                
                const finalEmbed = new EmbedBuilder()
                    .setColor("#3498DB")
                    .setTitle("🔓 Kanal Kilidi Kaldırıldı!")
                    .setDescription(`Bu kanal, yetkili ${interaction.user} tarafından manuel olarak tekrar kullanıma açılmıştır.`)
                    .setTimestamp();

                await interaction.update({ embeds: [finalEmbed], components: [] });
            } catch (err) {
                console.error('Kilit açma hatası:', err);
            }
        } else {
            return interaction.reply({ content: '❌ Hedef kanal bulunamadı.', ephemeral: true });
        }
    }
};
