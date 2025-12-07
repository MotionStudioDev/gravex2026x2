const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const TicketModel = require('../models/Ticket'); 
// BOTLİST SİSTEMİ İÇİN GEREKLİ MODELLER
const BotModel = require('../models/Bot');
const BotlistSettings = require('../models/BotlistSettings');

module.exports = async (client, interaction) => {
    
    // Yalnızca butonları ve modal gönderimlerini dinle
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    // =========================================================
    // TICKET SİSTEMİ MANTIĞI (Mevcut Kodunuz)
    // =========================================================

    // 1. TICKET MODAL AÇMA BUTONU
    if (interaction.isButton() && interaction.customId === 'open_ticket_modal') {
        
        const modal = new ModalBuilder()
            .setCustomId('submit_ticket_modal')
            .setTitle('🎫 Destek Talep Formu');

        const topicInput = new TextInputBuilder()
            .setCustomId('ticket_topic')
            .setLabel('Destek Konusu/Başlığı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(100)
            .setPlaceholder('Örn: Hesap sorunum var, Bağış yapamadım.');

        const descriptionInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('Sorunun Detaylı Açıklaması')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(20)
            .setMaxLength(1000)
            .setPlaceholder('Lütfen sorununuzu detaylı ve anlaşılır bir şekilde anlatın.');

        modal.addComponents(
            new ActionRowBuilder().addComponents(topicInput),
            new ActionRowBuilder().addComponents(descriptionInput)
        );

        return await interaction.showModal(modal);
    }


    // 2. TICKET MODAL GÖNDERİMİ - Bilet Oluşturma Mantığı
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_ticket_modal') {
        await interaction.deferReply({ ephemeral: true });

        const topic = interaction.fields.getTextInputValue('ticket_topic');
        const description = interaction.fields.getTextInputValue('ticket_description');

        try {
            const existingTicket = await TicketModel.findOne({ guildId: interaction.guildId, userId: interaction.user.id, status: 'open' });
            
            if (existingTicket) {
                const existingChannel = interaction.guild.channels.cache.get(existingTicket.channelId);
                
                if (existingChannel) {
                    return interaction.editReply({ 
                        content: `❌ Zaten açık bir biletiniz var: ${existingChannel}. Lütfen önce onu kapatın.`,
                    });
                } else {
                    await TicketModel.deleteOne({ channelId: existingTicket.channelId });
                }
            }
            
            const channelName = `talep-${topic.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)}`;
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, 
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, 
                ],
                reason: `${interaction.user.tag} tarafından bilet açıldı (Modal ile).`
            });

            const newTicket = new TicketModel({
                guildId: interaction.guildId,
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                topic: topic, 
                description: description
            });
            await newTicket.save();

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(`📝 Yeni Destek Talebi: ${topic}`)
                .setDescription('Destek ekibimiz en kısa sürede size yardımcı olacaktır. Aşağıda verdiğiniz detaylar bulunmaktadır.')
                .addFields(
                    { name: 'Kullanıcı', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Konu Başlığı', value: `\`${topic}\`` },
                    { name: 'Detaylı Açıklama', value: `\`\`\`${description}\`\`\`` }
                );

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Bileti Kapat').setStyle(ButtonStyle.Danger)
            );
            
            await ticketChannel.send({ content: `@here | Yeni talep oluşturuldu!`, embeds: [welcomeEmbed], components: [actionRow] });
            
            return interaction.editReply({ content: `✅ Talep biletiniz oluşturuldu: ${ticketChannel}`, ephemeral: true });

        } catch (error) {
            console.error('[KRİTİK HATA] Modal gönderimi sırasında bilet oluşturma hatası:', error);
            return interaction.editReply('❌ Talep oluşturulurken beklenmeyen bir hata oluştu. Botun yetkilerini kontrol edin.');
        }
    }
    
    // 3. BİLET KAPATMA BUTONU
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.deferReply();
        
        const ticketData = await TicketModel.findOne({ channelId: interaction.channelId });

        if (!ticketData) {
            return interaction.editReply('❌ Bu kanal bir bilet kanalı olarak kayıtlı değil.');
        }

        const canClose = interaction.user.id === ticketData.userId || interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        if (!canClose) {
            return interaction.editReply({ content: '❌ Bileti kapatmak için yetkiniz yok.', ephemeral: true });
        }

        const closeEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Bilet Kapatılıyor...')
            .setDescription(`Bilet ${interaction.user.tag} tarafından kapatıldı. Kanal 5 saniye içinde silinecektir.`);
        
        await interaction.editReply({ embeds: [closeEmbed], components: [] });

        await TicketModel.updateOne({ channelId: interaction.channelId }, { status: 'closed' });

        setTimeout(async () => {
            await interaction.channel.delete('Bilet kapatıldı.').catch(err => console.error("Kanal silme hatası:", err));
        }, 5000);
    }

    // =========================================================
    // BOTLİST SİSTEMİ MANTIĞI
    // =========================================================

    // 4. BOT EKLEME MODAL AÇMA BUTONU
    if (interaction.isButton() && interaction.customId === 'open_bot_submit_modal') {
        
        const modal = new ModalBuilder()
            .setCustomId('submit_bot_modal')
            .setTitle('🤖 Bot Listesi Başvuru Formu');

        const botIdInput = new TextInputBuilder()
            .setCustomId('bot_id')
            .setLabel('Bot ID (17-20 Haneli)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(17)
            .setMaxLength(20)
            .setPlaceholder('Örn: 123456789012345678');
            
        const prefixInput = new TextInputBuilder()
            .setCustomId('bot_prefix')
            .setLabel('Botunuzun Prefixi (Örn: ! veya $)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(5);

        const shortDescInput = new TextInputBuilder()
            .setCustomId('bot_short_desc')
            .setLabel('Kısa Açıklama (Listede Görünür)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const inviteInput = new TextInputBuilder()
            .setCustomId('bot_invite_url')
            .setLabel('Bot Davet Linki (Yetkileri İçermeli)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('https://discord.com/oauth2/authorize?client_id=...');

        modal.addComponents(
            new ActionRowBuilder().addComponents(botIdInput),
            new ActionRowBuilder().addComponents(prefixInput),
            new ActionRowBuilder().addComponents(shortDescInput),
            new ActionRowBuilder().addComponents(inviteInput)
        );

        return await interaction.showModal(modal);
    }


    // 5. BOT MODAL GÖNDERİMİ - Başvuru Kaydı
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_bot_modal') {
        await interaction.deferReply({ ephemeral: true });

        const botId = interaction.fields.getTextInputValue('bot_id');
        const prefix = interaction.fields.getTextInputValue('bot_prefix');
        const shortDesc = interaction.fields.getTextInputValue('bot_short_desc');
        const inviteUrl = interaction.fields.getTextInputValue('bot_invite_url');
        const ownerId = interaction.user.id;
        
        if (!/^\d{17,20}$/.test(botId)) {
            return interaction.editReply('❌ Geçerli bir Bot ID (17-20 hane) girmediniz.');
        }

        try {
            const existingBot = await BotModel.findOne({ botId });
            if (existingBot && existingBot.status !== 'Denied') {
                return interaction.editReply(`❌ Bu bot için zaten bekleyen bir başvurunuz var veya onaylanmış durumda. Mevcut durum: ${existingBot.status}.`);
            }

            const botUser = await client.users.fetch(botId).catch(() => null);

            if (!botUser || !botUser.bot) {
                return interaction.editReply('❌ Girdiğiniz ID ile ilişkili geçerli bir Discord botu bulunamadı.');
            }

            // Yeni Bot kaydını oluştur/güncelle
            await BotModel.findOneAndUpdate(
                { botId }, 
                {
                    ownerId,
                    prefix,
                    shortDescription: shortDesc,
                    longDescription: "Başvuruda uzun açıklama istenmedi, lütfen manuel ekleyin.",
                    inviteUrl,
                    status: 'Pending',
                    addedAt: Date.now(),
                },
                { upsert: true, new: true } 
            );

            // DİNAMİK LOG KANALI ÇEKME
            const guildSettings = await BotlistSettings.findOne({ guildId: interaction.guildId });
            const ADMIN_LOG_CHANNEL_ID = guildSettings ? guildSettings.logChannelId : null; 
            
            if (!ADMIN_LOG_CHANNEL_ID) {
                 return interaction.editReply('❌ Bu sunucuda bot başvuruları log kanalı ayarlanmamış. Lütfen bir yöneticiye `!botlist-ayarla log #kanal` komutunu kullanmasını söyleyin.');
            }

            const logChannel = client.channels.cache.get(ADMIN_LOG_CHANNEL_ID);
            
            if (!logChannel || logChannel.guild.id !== interaction.guildId) {
                return interaction.editReply('❌ Ayarlanmış log kanalı bulunamadı veya geçersiz. Lütfen ayarları kontrol edin.');
            }

            const logEmbed = new EmbedBuilder()
                .setColor('#FFC300')
                .setTitle(`🚨 Yeni Bot Başvurusu - ${botUser.tag}`)
                .setThumbnail(botUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Bot Sahibi', value: `<@${ownerId}> (${ownerId})` },
                    { name: 'Bot ID', value: botId, inline: true },
                    { name: 'Prefix', value: prefix, inline: true },
                    { name: 'Kısa Açıklama', value: shortDesc },
                    { name: 'Davet Linki', value: `[Davet Et](${inviteUrl})` },
                )
                .setFooter({ text: 'Onaylamak veya Reddetmek için aşağıdaki butonları kullanın.' });

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`approve_${botId}`).setLabel('✅ Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`deny_${botId}`).setLabel('❌ Reddet').setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ embeds: [logEmbed], components: [actionRow] });

            return interaction.editReply(`✅ Bot başvurunuz başarıyla alındı. **${botUser.tag}** adlı botunuz <#${ADMIN_LOG_CHANNEL_ID}> kanalında onay için beklemektedir.`);

        } catch (error) {
            console.error('[BOT SUBMIT HATA]:', error);
            return interaction.editReply('❌ Bot başvurusu sırasında bir hata oluştu. Lütfen bot ID ve linkinin doğru olduğundan emin olun.');
        }
    }

    // 6. ONAY/RED BUTONLARI (Yönetici İşlemi)
    if (interaction.isButton() && (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('deny_'))) {
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Bu işlemi yapmak için Yönetici yetkiniz olmalıdır.', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });

        const action = interaction.customId.split('_')[0]; 
        const botId = interaction.customId.split('_')[1]; 

        try {
            const botData = await BotModel.findOne({ botId });
            if (!botData) {
                return interaction.editReply('❌ Bu bot veritabanında bulunamadı.');
            }
            if (botData.status !== 'Pending') {
                 return interaction.editReply(`❌ Bu bot zaten ${botData.status} olarak işaretlenmiş.`);
            }

            const botUser = await client.users.fetch(botId);
            const owner = await client.users.fetch(botData.ownerId);

            if (action === 'approve') {
                botData.status = 'Approved';
                await botData.save();

                const approveEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(`✅ Bot Onaylandı: ${botUser.tag}`)
                    .setDescription(`Botunuz **${interaction.user.tag}** tarafından onaylanmıştır. Artık listemizdesiniz!`);
                await owner.send({ embeds: [approveEmbed] }).catch(() => {});
                
                await interaction.message.edit({ 
                    content: `✅ Onaylandı: ${botUser.tag} - Yönetici: ${interaction.user.tag}`,
                    embeds: [interaction.message.embeds[0].setColor('#00FF00')],
                    components: []
                });
                return interaction.editReply(`✅ **${botUser.tag}** başarıyla onaylandı.`);

            } else if (action === 'deny') {
                botData.status = 'Denied';
                await botData.save();
                
                const denyEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`❌ Bot Reddedildi: ${botUser.tag}`)
                    .setDescription(`Üzgünüz, bot başvurunuz **${interaction.user.tag}** tarafından reddedilmiştir.`);
                await owner.send({ embeds: [denyEmbed] }).catch(() => {});

                await interaction.message.edit({ 
                    content: `❌ Reddedildi: ${botUser.tag} - Yönetici: ${interaction.user.tag}`,
                    embeds: [interaction.message.embeds[0].setColor('#FF0000')],
                    components: []
                });
                return interaction.editReply(`❌ **${botUser.tag}** başarıyla reddedildi.`);
            }

        } catch (error) {
            console.error('[BOT ONAY/RED HATA]:', error);
            return interaction.editReply('❌ İşlem sırasında kritik bir hata oluştu.');
        }
    }
};
