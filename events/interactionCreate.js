const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const TicketModel = require('../models/Ticket'); 

module.exports = async (client, interaction) => {
    
    // Yalnızca butonları ve modal gönderimlerini dinle
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    // =========================================================
    // 1. MODAL AÇMA BUTONU (open_ticket_modal)
    // =========================================================
    if (interaction.isButton() && interaction.customId === 'open_ticket_modal') {
        
        // Modal Tanımlama
        const modal = new ModalBuilder()
            .setCustomId('submit_ticket_modal')
            .setTitle('🎫 Destek Talep Formu');

        // 1. Input: Konu Başlığı
        const topicInput = new TextInputBuilder()
            .setCustomId('ticket_topic')
            .setLabel('Destek Konusu/Başlığı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(100)
            .setPlaceholder('Örn: Hesap sorunum var, Bağış yapamadım.');

        // 2. Input: Detaylı Açıklama
        const descriptionInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('Sorunun Detaylı Açıklaması')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(20)
            .setMaxLength(1000)
            .setPlaceholder('Lütfen sorununuzu detaylı ve anlaşılır bir şekilde anlatın.');

        // Modal'a Inputları ekleme
        modal.addComponents(
            new ActionRowBuilder().addComponents(topicInput),
            new ActionRowBuilder().addComponents(descriptionInput)
        );

        // Modal'ı kullanıcıya göster
        return await interaction.showModal(modal);
    }


    // =========================================================
    // 2. MODAL GÖNDERİMİ (submit_ticket_modal) - Bilet Oluşturma Mantığı
    // =========================================================
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit_ticket_modal') {
        // Modal gönderiminde de Discord'un 3 saniyelik yanıt süresi vardır, bu yüzden hemen deferReply yapıyoruz.
        await interaction.deferReply({ ephemeral: true });

        // Modal'dan verileri çek
        const topic = interaction.fields.getTextInputValue('ticket_topic');
        const description = interaction.fields.getTextInputValue('ticket_description');

        try {
            // MongoDB'den açık bilet kontrolü (Önceki kodunuzdan)
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
            
            // Kanal oluşturma ve izinleri ayarlama
            const channelName = `talep-${topic.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)}`;
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: null, // Kategori ID'si
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, 
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, 
                    // Yönetici/Moderatör izinleri
                ],
                reason: `${interaction.user.tag} tarafından bilet açıldı (Modal ile).`
            });

            // MongoDB'ye yeni kaydı oluştur
            const newTicket = new TicketModel({
                guildId: interaction.guildId,
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                topic: topic, // Yeni eklendi (Modelde yoksa hata verir, bkz. Not)
                description: description // Yeni eklendi
            });
            await newTicket.save();

            // Karşılama Embed'i: Modal verilerini içerir
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
            
            // Destek ekibini bilgilendirmek için ping (isteğe bağlı)
            await ticketChannel.send({ content: `@here | Yeni talep oluşturuldu!`, embeds: [welcomeEmbed], components: [actionRow] });
            
            return interaction.editReply({ content: `✅ Talep biletiniz oluşturuldu: ${ticketChannel}`, ephemeral: true });

        } catch (error) {
            console.error('[KRİTİK HATA] Modal gönderimi sırasında bilet oluşturma hatası:', error);
            return interaction.editReply('❌ Talep oluşturulurken beklenmeyen bir hata oluştu. Botun yetkilerini kontrol edin.');
        }
    }
    
    // =========================================================
    // 3. BİLET KAPATMA BUTONU (close_ticket)
    // =========================================================
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
};
