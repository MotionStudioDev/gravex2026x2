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
    
    // Sadece Buton ve Modal işlemlerini dinle
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    // =========================================================
    // 1. TICKET SİSTEMİ: BUTONLAR (MODAL AÇMA & İŞLEMLER)
    // =========================================================

    // 🔴 KRİTİK FİX: Ticket Açma Butonu (Burada deferReply ASLA kullanılmaz)
    if (interaction.isButton() && interaction.customId === 'open_ticket_modal') {
        try {
            const modal = new ModalBuilder()
                .setCustomId('submit_ticket_modal')
                .setTitle('🎫 Destek Talep Formu');

            const topicInput = new TextInputBuilder()
                .setCustomId('ticket_topic')
                .setLabel('Konu Başlığı')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100)
                .setPlaceholder('Sorununuzu birkaç kelimeyle özetleyin.');

            const descriptionInput = new TextInputBuilder()
                .setCustomId('ticket_description')
                .setLabel('Detaylı Açıklama')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000)
                .setPlaceholder('Lütfen sorununuzu detaylıca anlatın.');

            modal.addComponents(
                new ActionRowBuilder().addComponents(topicInput),
                new ActionRowBuilder().addComponents(descriptionInput)
            );

            // Modal'ı direkt gösteriyoruz, bekleme mesajı yok!
            return await interaction.showModal(modal);

        } catch (err) {
            console.error('Ticket Modal Hatası:', err);
            // Modal açılmazsa sessizce logla, kullanıcıya reply atma (zaten etkileşim hatası verir)
        }
    }

    // Ticket Üstlenme Butonu
    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
        // Burada veritabanı işlemi olduğu için bekletebiliriz
        await interaction.deferReply({ ephemeral: false }); 

        const ticketData = await TicketModel.findOne({ channelId: interaction.channelId });
        if (!ticketData) {
            return interaction.editReply({ content: '❌ Bu kanal veritabanında bulunamadı.' });
        }

        const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .addFields({ name: '✅ Yetkili', value: `${interaction.user}`, inline: false })
            .setColor('Blue');

        const newRow = ActionRowBuilder.from(interaction.message.components[0]);
        newRow.components[0].setDisabled(true).setLabel('Üstlenildi').setStyle(ButtonStyle.Secondary);

        await interaction.message.edit({ embeds: [newEmbed], components: [newRow] });
        return interaction.editReply({ content: `🔔 **${interaction.user.tag}** talebi devraldı.` });
    }

    // Sesli Destek Butonu
    if (interaction.isButton() && interaction.customId === 'voice_support') {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const voiceChannel = await interaction.guild.channels.create({
                name: `🔊-${interaction.user.username}`,
                type: ChannelType.GuildVoice,
                parent: interaction.channel.parentId,
                permissionOverwrites: interaction.channel.permissionOverwrites.cache.map(p => p)
            });
            return interaction.editReply({ content: `✅ Sesli kanal oluşturuldu: ${voiceChannel}` });
        } catch (e) {
            return interaction.editReply({ content: '❌ Sesli kanal oluşturulurken hata oluştu.' });
        }
    }

    // Ticket Kapatma Butonu
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 Talep sonlandırılıyor, kanal birazdan silinecek...');
        
        await TicketModel.updateOne({ channelId: interaction.channelId }, { status: 'closed' });
        
        setTimeout(async () => {
            if (interaction.channel) await interaction.channel.delete().catch(() => {});
        }, 5000);
        return;
    }

    // =========================================================
    // 2. TICKET SİSTEMİ: FORM GÖNDERİMİ (SUBMIT)
    // =========================================================
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_ticket_modal') {
        // Form gönderildiği an "Düşünüyor..." diyebiliriz, çünkü modal kapandı.
        await interaction.deferReply({ ephemeral: true });

        const topic = interaction.fields.getTextInputValue('ticket_topic');
        const desc = interaction.fields.getTextInputValue('ticket_description');

        try {
            const settings = await TicketSettings.findOne({ guildId: interaction.guildId });
            
            // Kanal oluşturma
            const channel = await interaction.guild.channels.create({
                name: `talep-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: settings?.categoryId || null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: settings?.staffRoleId || interaction.guild.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            // DB Kayıt
            await TicketModel.create({
                guildId: interaction.guildId,
                channelId: channel.id,
                userId: interaction.user.id,
                topic: topic,
                description: desc,
                status: 'open'
            });

            // Kanal İçeriği
            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle(`📝 Yeni Destek Talebi: ${topic}`)
                .setDescription(`**Kullanıcı:** ${interaction.user}\n**Açıklama:** ${desc}`)
                .setFooter({ text: 'Grave Destek Sistemi' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Üstlen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('voice_support').setLabel('Sesli').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Kapat').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `${interaction.user} | <@&${settings?.staffRoleId || interaction.guild.id}>`, embeds: [embed], components: [row] });
            
            // İşlem bitti, bekletme mesajını güncelle
            return interaction.editReply({ content: `✅ Talebiniz başarıyla açıldı: ${channel}` });

        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '❌ Bilet oluşturulurken bir hata meydana geldi.' });
        }
    }

    // =========================================================
    // 3. BOTLİST SİSTEMİ: BAŞVURU (MODAL AÇMA)
    // =========================================================

    // 🔴 KRİTİK FİX: Bot Başvuru Butonu (Burada da deferReply YOK)
    if (interaction.isButton() && interaction.customId === 'open_bot_submit_modal') {
        const modal = new ModalBuilder().setCustomId('submit_bot_modal').setTitle('🤖 Bot Başvuru Formu');
        
        const bId = new TextInputBuilder().setCustomId('bot_id').setLabel('Bot ID').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(17);
        const bPre = new TextInputBuilder().setCustomId('bot_prefix').setLabel('Prefix').setStyle(TextInputStyle.Short).setRequired(true);
        const bDesc = new TextInputBuilder().setCustomId('bot_short_desc').setLabel('Kısa Açıklama').setStyle(TextInputStyle.Short).setRequired(true);
        const bInv = new TextInputBuilder().setCustomId('bot_invite_url').setLabel('Davet Linki').setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(bId),
            new ActionRowBuilder().addComponents(bPre),
            new ActionRowBuilder().addComponents(bDesc),
            new ActionRowBuilder().addComponents(bInv)
        );

        return await interaction.showModal(modal);
    }

    // =========================================================
    // 4. BOTLİST SİSTEMİ: FORM GÖNDERİMİ VE ONAY
    // =========================================================
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_bot_modal') {
        await interaction.deferReply({ ephemeral: true }); // Form gitti, şimdi bekletebiliriz.

        const bId = interaction.fields.getTextInputValue('bot_id');
        const bPre = interaction.fields.getTextInputValue('bot_prefix');
        const bDesc = interaction.fields.getTextInputValue('bot_short_desc');
        const bInv = interaction.fields.getTextInputValue('bot_invite_url');

        try {
            const botUser = await client.users.fetch(bId).catch(() => null);
            if (!botUser || !botUser.bot) {
                return interaction.editReply('❌ Geçersiz ID. Lütfen doğru bir Bot ID giriniz.');
            }

            // DB Güncelle
            await BotModel.findOneAndUpdate(
                { botId: bId },
                { ownerId: interaction.user.id, prefix: bPre, shortDescription: bDesc, inviteUrl: bInv, status: 'Pending', addedAt: Date.now() },
                { upsert: true }
            );

            // Log Kanalına Gönder
            const settings = await BotlistSettings.findOne({ guildId: interaction.guildId });
            const logCh = client.channels.cache.get(settings?.logChannelId);

            if (logCh) {
                const embed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle('🚨 Yeni Bot Başvurusu')
                    .setThumbnail(botUser.displayAvatarURL())
                    .addFields(
                        { name: 'Bot', value: `${botUser.tag} (\`${bId}\`)`, inline: true },
                        { name: 'Sahip', value: `${interaction.user}`, inline: true },
                        { name: 'Prefix', value: bPre, inline: true },
                        { name: 'Açıklama', value: bDesc }
                    );

                const btns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`approve_${bId}`).setLabel('Onayla').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`deny_${bId}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
                );

                await logCh.send({ embeds: [embed], components: [btns] });
                return interaction.editReply('✅ Başvurunuz başarıyla yetkililere iletildi.');
            } else {
                return interaction.editReply('❌ Sistem hatası: Log kanalı bulunamadı.');
            }

        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ Beklenmedik bir hata oluştu.');
        }
    }

    // Bot Onay/Red İşlemleri
    if (interaction.isButton() && (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('deny_'))) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ Yetkiniz yok.', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });
        
        const action = interaction.customId.split('_')[0];
        const botId = interaction.customId.split('_')[1];

        const botData = await BotModel.findOne({ botId });
        if (!botData) return interaction.editReply('❌ Veri bulunamadı.');

        const botUser = await client.users.fetch(botId).catch(() => null);
        const owner = await client.users.fetch(botData.ownerId).catch(() => null);

        if (action === 'approve') {
            botData.status = 'Approved';
            await botData.save();
            if (owner) owner.send(`✅ **${botUser?.tag}** onaylandı.`).catch(() => {});
            await interaction.message.edit({ content: `✅ Onaylandı: ${botUser?.tag} - Yetkili: ${interaction.user}`, components: [] });
            return interaction.editReply('✅ Bot onaylandı.');
        } else {
            botData.status = 'Denied';
            await botData.save();
            if (owner) owner.send(`❌ **${botUser?.tag}** reddedildi.`).catch(() => {});
            await interaction.message.edit({ content: `❌ Reddedildi: ${botUser?.tag} - Yetkili: ${interaction.user}`, components: [] });
            return interaction.editReply('❌ Bot reddedildi.');
        }
    }

    // =========================================================
    // 5. MANUEL KİLİT SİSTEMİ
    // =========================================================
    if (interaction.isButton() && interaction.customId.startsWith('unlock_manual_')) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '❌ Yetkiniz yok.', ephemeral: true });

        const chId = interaction.customId.split('_')[2];
        const channel = interaction.guild.channels.cache.get(chId);

        if (channel) {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
            const embed = new EmbedBuilder().setColor('Blue').setTitle('🔓 Kanal Açıldı').setDescription(`Kanal ${interaction.user} tarafından açıldı.`);
            await interaction.update({ embeds: [embed], components: [] });
        } else {
            return interaction.reply({ content: '❌ Kanal bulunamadı.', ephemeral: true });
        }
    }
};
