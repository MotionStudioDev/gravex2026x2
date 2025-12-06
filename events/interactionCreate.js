// En üstte yer alacak importlar
const { InteractionType, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const TicketModel = require('../models/Ticket'); // Model yolunuza göre ayarlayın

// Botunuzun başlangıç dosyasında (örn. index.js), MongoDB bağlantısını kurduğunuzdan emin olun!
// mongoose.connect(process.env.MONGO_URI, { /* options */ });

module.exports = async (client, interaction) => {
    
    // Yalnızca buton etkileşimlerini dinle
    if (!interaction.isButton()) return;

    // --- A) Bilet Oluşturma Butonu ---
    if (interaction.customId === 'create_ticket') {
        await interaction.deferReply({ ephemeral: true });

        const existingTicket = await TicketModel.findOne({ guildId: interaction.guildId, userId: interaction.user.id, status: 'open' });
        
        if (existingTicket) {
            const existingChannel = interaction.guild.channels.cache.get(existingTicket.channelId);
            if (existingChannel) {
                return interaction.editReply({ 
                    content: `❌ Zaten açık bir biletiniz var: ${existingChannel}. Lütfen önce onu kapatın.`,
                });
            } else {
                 // Eğer DB'de var ama kanal silinmişse, DB kaydını sil.
                 await TicketModel.deleteOne({ channelId: existingTicket.channelId });
            }
        }
        
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            type: ChannelType.GuildText,
            parent: null, // Bilet kategorisinin ID'sini buraya yazabilirsiniz!
            permissionOverwrites: [
                // @everyone iznini kapat
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, 
                // Bileti açan kullanıcıya izin ver
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, 
                // Yönetici rolüne (veya yetkili role) izin ver
                { id: 'YETKILI_ROL_ID', allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] } // Burayı değiştirin!
            ],
            reason: `${interaction.user.tag} tarafından bilet açıldı.`
        });

        // MongoDB'ye kaydet
        const newTicket = new TicketModel({
            guildId: interaction.guildId,
            channelId: ticketChannel.id,
            userId: interaction.user.id,
        });
        await newTicket.save();

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#2095F2')
            .setTitle(`Hoş Geldiniz, ${interaction.user.username}`)
            .setDescription('Destek ekibimiz en kısa sürede size yardımcı olacaktır. Lütfen sorununuzu detaylıca anlatın.')
            .addFields({ name: 'Kullanıcı', value: `<@${interaction.user.id}>`, inline: true });

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Bileti Kapat').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [welcomeEmbed], components: [actionRow] });
        await interaction.editReply({ content: `✅ Biletiniz oluşturuldu: ${ticketChannel}`, ephemeral: true });
    }

    // --- B) Bileti Kapatma Butonu ---
    if (interaction.customId === 'close_ticket') {
        await interaction.deferReply();

        const ticketData = await TicketModel.findOne({ channelId: interaction.channelId });

        if (!ticketData) {
            return interaction.editReply('❌ Bu kanal bir bilet kanalı olarak kayıtlı değil.');
        }

        // Kapatma izni: Sadece bileti açan kişi veya yönetici/yetkili rolleri
        const canClose = interaction.user.id === ticketData.userId || interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        if (!canClose) {
            return interaction.editReply({ content: '❌ Bileti kapatmak için yetkiniz yok.', ephemeral: true });
        }

        const closeEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Bilet Kapatılıyor...')
            .setDescription(`Bilet ${interaction.user.tag} tarafından kapatıldı. Kanal 5 saniye içinde silinecektir.`);
        
        await interaction.editReply({ embeds: [closeEmbed], components: [] });

        // MongoDB kaydını güncelle
        ticketData.status = 'closed';
        await ticketData.save();

        // 5 saniye sonra kanalı sil
        setTimeout(async () => {
            await interaction.channel.delete('Bilet kapatıldı.').catch(err => console.error("Kanal silme hatası:", err));
        }, 5000);
    }
};
