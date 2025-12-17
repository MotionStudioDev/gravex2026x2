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
    
    /**
     * @description Etkileşim türlerini filtrele. 
     * Sadece buton ve modal işlemlerine izin veriyoruz.
     */
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) {
        return;
    }

    // =========================================================
    // 🎫 TICKET SİSTEMİ BÖLÜMÜ (Açılış, Üstlenme, Kapatma)
    // =========================================================

    // 1. TICKET MODALINI TETİKLEYEN ANA BUTON
    if (interaction.isButton() && interaction.customId === 'open_ticket_modal') {
        
        const ticketModal = new ModalBuilder()
            .setCustomId('submit_ticket_modal')
            .setTitle('🎫 Grave Destek ve Yardım Formu');

        const topicInput = new TextInputBuilder()
            .setCustomId('ticket_topic')
            .setLabel('Destek Konusu/Başlığı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(100)
            .setPlaceholder('Örn: Sunucu içerisindeki hatayı bildirmek istiyorum.');

        const descriptionInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('Sorunun Detaylı Açıklaması')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(20)
            .setMaxLength(1000)
            .setPlaceholder('Lütfen yaşadığınız durumu en az 20 karakter olacak şekilde detaylıca açıklayınız.');

        const actionRow1 = new ActionRowBuilder().addComponents(topicInput);
        const actionRow2 = new ActionRowBuilder().addComponents(descriptionInput);

        ticketModal.addComponents(actionRow1, actionRow2);

        try {
            return await interaction.showModal(ticketModal);
        } catch (modalError) {
            console.error('[CRITICAL] Ticket Modalı gösterilirken bir hata oluştu:', modalError);
            return;
        }
    }

    // 2. TICKET FORM GÖNDERİMİ (KANAL OLUŞTURMA)
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_ticket_modal') {
        
        await interaction.deferReply({ ephemeral: true });

        const topic = interaction.fields.getTextInputValue('ticket_topic');
        const description = interaction.fields.getTextInputValue('ticket_description');
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        try {
            // Önceki bilet var mı kontrol et
            const existingBilet = await TicketModel.findOne({ 
                guildId: guildId, 
                userId: userId, 
                status: 'open' 
            });
            
            if (existingBilet) {
                const biletChannel = interaction.guild.channels.cache.get(existingBilet.channelId);
                if (biletChannel) {
                    return interaction.editReply({ 
                        content: `❌ Zaten aktif bir destek talebiniz bulunmaktadır: ${biletChannel}. Lütfen yeni bir tane açmadan önce mevcudu kapatın.`,
                    });
                } else {
                    // Veritabanında var ama kanal yoksa temizlik yap
                    await TicketModel.deleteOne({ channelId: existingBilet.channelId });
                }
            }
            
            // Ayarları veritabanından getir
            const guildSettings = await TicketSettings.findOne({ guildId: guildId });
            
            // Kanal ismini düzenle
            const cleanTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
            const channelName = `talep-${cleanTopic}`;
            
            // Destek kanalını oluştur
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: guildSettings ? guildSettings.categoryId : null,
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
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.EmbedLinks
                        ] 
                    }, 
                    { 
                        id: guildSettings ? guildSettings.staffRoleId : interaction.guild.id, 
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, 
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ] 
                    }
                ],
                reason: `${interaction.user.tag} tarafından başlatılan destek süreci.`
            });

            // Veritabanına kaydet
            const biletKaydi = new TicketModel({
                guildId: guildId,
                channelId: ticketChannel.id,
                userId: userId,
                topic: topic, 
                description: description,
                status: 'open',
                createdAt: new Date()
            });
            await biletKaydi.save();

            // Karşılama Mesajı
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(`📝 Yeni Destek Talebi: ${topic}`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setDescription('Destek ekibimiz talebinizi başarıyla aldı. En kısa süre içerisinde yetkililerimiz size geri dönüş sağlayacaktır.')
                .addFields(
                    { name: '👤 Kullanıcı', value: `${interaction.user} (\`${userId}\`)`, inline: true },
                    { name: '📝 Konu Başlığı', value: `\`${topic}\``, inline: true },
                    { name: '📄 Detaylı Açıklama', value: `\`\`\`${description}\`\`\`` }
                )
                .setFooter({ text: 'Grave Ticket Sistemi', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            // Kontrol Butonları
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
                content: `🚀 Bilgilendirme: ${interaction.user} | <@&${guildSettings ? guildSettings.staffRoleId : ''}>`, 
                embeds: [welcomeEmbed], 
                components: [controlButtons] 
            });
            
            return interaction.editReply({ 
                content: `✅ Destek biletiniz başarıyla oluşturuldu: ${ticketChannel}` 
            });

        } catch (ticketError) {
            console.error('[ERROR] Bilet kanalı açılırken hata:', ticketError);
            return interaction.editReply({ 
                content: '❌ Maalesef biletiniz oluşturulurken teknik bir hata ile karşılaşıldı. Lütfen yöneticiye başvurun.' 
            });
        }
    }

    // 3. TICKET BUTON KONTROLLERİ (ÜSTLENME, SESLİ, KAPATMA)
    if (interaction.isButton()) {
        
        // Üstlenme İşlemi
        if (interaction.customId === 'claim_ticket') {
            const biletVerisi = await TicketModel.findOne({ channelId: interaction.channelId });
            
            if (!biletVerisi) {
                return interaction.reply({ content: '❌ Bu kanal bir bilet kanalı olarak tanınmıyor.', ephemeral: true });
            }

            const claimedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .addFields({ 
                    name: '✅ Sorumlu Yetkili', 
                    value: `${interaction.user} (\`${interaction.user.tag}\`)`, 
                    inline: false 
                })
                .setColor('#3498DB');

            const updatedRow = ActionRowBuilder.from(interaction.message.components[0]);
            updatedRow.components[0].setDisabled(true).setLabel('Bilet Üstlenildi');

            await interaction.update({ 
                embeds: [claimedEmbed], 
                components: [updatedRow] 
            });

            return interaction.followUp({ 
                content: `🔔 **${interaction.user.tag}** isimli yetkili bu talebi üstlendi ve sizinle ilgileniyor.` 
            });
        }

        // Sesli Oda Açma İşlemi
        if (interaction.customId === 'voice_support') {
            try {
                const voiceChannel = await interaction.guild.channels.create({
                    name: `🔊-destek-${interaction.user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: interaction.channel.parentId,
                    permissionOverwrites: interaction.channel.permissionOverwrites.cache.map(perms => perms)
                });

                return interaction.reply({ 
                    content: `✅ Sesli kanalınız başarıyla oluşturuldu: ${voiceChannel}`, 
                    ephemeral: true 
                });
            } catch (err) {
                console.error('Sesli kanal hatası:', err);
                return interaction.reply({ content: '❌ Sesli kanal oluşturmak için yeterli yetkim bulunmuyor.', ephemeral: true });
            }
        }

        // Kapatma İşlemi
        if (interaction.customId === 'close_ticket') {
            const biletKontrol = await TicketModel.findOne({ channelId: interaction.channelId });
            
            if (!biletKontrol) {
                return interaction.reply({ content: '❌ Bu işlem yalnızca bilet kanallarında gerçekleştirilebilir.', ephemeral: true });
            }

            await interaction.reply({ 
                content: '⚠️ Destek talebi sonlandırılıyor... Kanal 5 saniye içerisinde silinecektir.' 
            });

            await TicketModel.updateOne(
                { channelId: interaction.channelId }, 
                { status: 'closed', closedAt: new Date() }
            );
            
            return setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (e) {
                    console.error('Kanal silme hatası:', e);
                }
            }, 5000);
        }
    }

    // =========================================================
    // 🤖 BOTLİST SİSTEMİ BÖLÜMÜ (Başvuru, Onay, Red)
    // =========================================================

    // BOT BAŞVURU MODAL TETİKLEYİCİ
    if (interaction.isButton() && interaction.customId === 'open_bot_submit_modal') {
        
        const botListModal = new ModalBuilder()
            .setCustomId('submit_bot_modal')
            .setTitle('🤖 Grave Bot Listesi Başvurusu');

        const botIdField = new TextInputBuilder()
            .setCustomId('bot_id')
            .setLabel('Bot ID Adresi')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(17)
            .setMaxLength(20)
            .setPlaceholder('Botunuzun Client ID numarasını buraya giriniz.');

        const botPrefixField = new TextInputBuilder()
            .setCustomId('bot_prefix')
            .setLabel('Bot Prefixi')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(5)
            .setPlaceholder('Örn: !');

        const botShortDescField = new TextInputBuilder()
            .setCustomId('bot_short_desc')
            .setLabel('Kısa Açıklama')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
            .setPlaceholder('Botunuzun ne işe yaradığını kısaca anlatın.');

        const botInviteField = new TextInputBuilder()
            .setCustomId('bot_invite_url')
            .setLabel('Bot Davet Linki')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Botun OAuth2 davet linkini buraya yapıştırın.');

        botListModal.addComponents(
            new ActionRowBuilder().addComponents(botIdField),
            new ActionRowBuilder().addComponents(botPrefixField),
            new ActionRowBuilder().addComponents(botShortDescField),
            new ActionRowBuilder().addComponents(botInviteField)
        );

        return await interaction.showModal(botListModal);
    }

    // BOT BAŞVURU FORM GÖNDERİMİ
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_bot_modal') {
        
        await interaction.deferReply({ ephemeral: true });

        const bId = interaction.fields.getTextInputValue('bot_id');
        const bPrefix = interaction.fields.getTextInputValue('bot_prefix');
        const bDesc = interaction.fields.getTextInputValue('bot_short_desc');
        const bInvite = interaction.fields.getTextInputValue('bot_invite_url');

        try {
            // Mevcut bot kontrolü
            const botVarmı = await BotModel.findOne({ botId: bId });
            if (botVarmı && botVarmı.status !== 'Denied') {
                return interaction.editReply(`❌ Bu bot zaten sistemimizde kayıtlı. Durum: **${botVarmı.status}**`);
            }

            const targetBot = await client.users.fetch(bId).catch(() => null);
            if (!targetBot || !targetBot.bot) {
                return interaction.editReply('❌ Girdiğiniz ID bir bot kullanıcısına ait değil.');
            }

            // Veritabanı güncelleme/oluşturma
            await BotModel.findOneAndUpdate(
                { botId: bId }, 
                { 
                    ownerId: interaction.user.id, 
                    prefix: bPrefix, 
                    shortDescription: bDesc, 
                    inviteUrl: bInvite, 
                    status: 'Pending', 
                    addedAt: Date.now() 
                }, 
                { upsert: true }
            );

            // Log kanalı ayarını çek
            const botSettings = await BotlistSettings.findOne({ guildId: interaction.guildId });
            if (!botSettings || !botSettings.logChannelId) {
                return interaction.editReply('❌ Botlist log kanalı sunucu ayarlarında bulunamadı.');
            }

            const logChannel = interaction.guild.channels.cache.get(botSettings.logChannelId);
            if (!logChannel) return interaction.editReply('❌ Log kanalı mevcut değil.');

            const botEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle(`🚨 Yeni Bot Başvurusu: ${targetBot.tag}`)
                .setThumbnail(targetBot.displayAvatarURL())
                .addFields(
                    { name: '👤 Başvuran', value: `${interaction.user} (\`${interaction.user.id}\`)` },
                    { name: '🆔 Bot ID', value: `\`${bId}\``, inline: true },
                    { name: '⌨️ Prefix', value: `\`${bPrefix}\``, inline: true },
                    { name: '📄 Açıklama', value: bDesc }
                )
                .setTimestamp();

            const botButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`approve_${bId}`).setLabel('✅ Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`deny_${bId}`).setLabel('❌ Reddet').setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ embeds: [botEmbed], components: [botButtons] });
            return interaction.editReply(`✅ Bot başvurunuz iletildi. Log: <#${logChannel.id}>`);

        } catch (botErr) {
            console.error('Botlist error:', botErr);
            return interaction.editReply('❌ Başvuru sırasında bir sorun oluştu.');
        }
    }

    // BOT ONAY / RED İŞLEMİ (LOG KANALINDAKİ BUTONLAR)
    if (interaction.isButton() && (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('deny_'))) {
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Bu işlemi sadece yöneticiler yapabilir.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        
        const splitId = interaction.customId.split('_');
        const actionType = splitId[0];
        const targetBotId = splitId[1];

        const dbBot = await BotModel.findOne({ botId: targetBotId });
        if (!dbBot) return interaction.editReply('❌ Bu botun verisi sistemde bulunamadı.');

        const botUserObj = await client.users.fetch(targetBotId).catch(() => null);
        const ownerUserObj = await client.users.fetch(dbBot.ownerId).catch(() => null);

        if (actionType === 'approve') {
            dbBot.status = 'Approved';
            await dbBot.save();
            if (ownerUserObj) ownerUserObj.send(`✅ **${botUserObj?.tag || targetBotId}** adlı botunuz onaylandı!`).catch(() => {});
            await interaction.message.edit({ 
                content: `✅ Onaylandı: ${botUserObj?.tag || targetBotId} (Yetkili: ${interaction.user.tag})`, 
                embeds: [], components: [] 
            });
            return interaction.editReply('✅ Bot onaylama işlemi başarılı.');
        } else {
            dbBot.status = 'Denied';
            await dbBot.save();
            if (ownerUserObj) ownerUserObj.send(`❌ **${botUserObj?.tag || targetBotId}** adlı botunuz reddedildi.`).catch(() => {});
            await interaction.message.edit({ 
                content: `❌ Reddedildi: ${botUserObj?.tag || targetBotId} (Yetkili: ${interaction.user.tag})`, 
                embeds: [], components: [] 
            });
            return interaction.editReply('❌ Bot başvurusu reddedildi.');
        }
    }

    // =========================================================
    // 🔓 KİLİT SİSTEMİ BÖLÜMÜ
    // =========================================================
    if (interaction.isButton() && interaction.customId.startsWith('unlock_manual_')) {
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Kanalları yönetme yetkiniz bulunmuyor.', ephemeral: true });
        }

        const channelID = interaction.customId.split('_')[2];
        const targetCh = interaction.guild.channels.cache.get(channelID);
        
        if (targetCh) {
            try {
                await targetCh.permissionOverwrites.edit(interaction.guild.roles.everyone, { 
                    SendMessages: true 
                });
                
                const unlockEmbed = new EmbedBuilder()
                    .setColor("#3498DB")
                    .setTitle("🔓 Kanal Kilidi Kaldırıldı!")
                    .setDescription(`Kanal, yetkili ${interaction.user} tarafından manuel olarak açıldı.`)
                    .setFooter({ text: 'Kilit Yönetimi' })
                    .setTimestamp();

                await interaction.update({ embeds: [unlockEmbed], components: [] });
            } catch (unlockErr) {
                console.error('Kilit açma hatası:', unlockErr);
                return interaction.reply({ content: '❌ Kanal kilidi açılırken yetki hatası oluştu.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: '❌ Hedef kanal artık mevcut değil.', ephemeral: true });
        }
    }
};
