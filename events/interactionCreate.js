const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const TicketModel = require('../models/Ticket'); 

// Bu dosya events/interactionCreate.js veya benzeri bir yoldadır.

module.exports = async (client, interaction) => {
    
    if (!interaction.isButton()) return;

    // --- A) Bilet Oluşturma Butonu ---
    if (interaction.customId === 'create_ticket') {
        // !!! KRİTİK FİX: ETKİLEŞİMİ HEMEN TANI (DeferReply) !!!
        await interaction.deferReply({ ephemeral: true });

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
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            type: ChannelType.GuildText,
            parent: null, // İsteğe bağlı kategori ID'si
            permissionOverwrites: [
                // 1. @everyone iznini kapat (Kimse görmesin)
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, 
                // 2. Bileti açan kullanıcıya izin ver
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, 
                // 3. Kanalları Yönet yetkisine sahip herkesin görmesini sağla
                // Bu, genel botlar için en iyi yaklaşımdır.
                { id: interaction.guild.id, 
                  allow: [PermissionsBitField.Flags.ViewChannel], // Yönetici rolü yerine, izinleri genelleyebiliriz.
                  permissionOverwrites: [ 
                    {
                        id: interaction.guild.roles.cache.find(r => r.permissions.has(PermissionsBitField.Flags.ManageChannels))?.id || interaction.guild.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    }
                  ]
                }
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

        // Kapatma izni: Sadece bileti açan kişi VEYA Kanalları Yönet yetkisine sahip herkes
        const canClose = interaction.user.id === ticketData.userId || interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        if (!canClose) {
            return interaction.editReply({ content: '❌ Bileti kapatmak için yetkiniz yok.', ephemeral: true });
        }

        const closeEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Bilet Kapatılıyor...')
            .setDescription(`Bilet ${interaction.user.tag} tarafından kapatıldı. Kanal 5 saniye içinde silinecektir.`);
        
        await interaction.editReply({ embeds: [closeEmbed], components: [] });

        ticketData.status = 'closed';
        await ticketData.save();

        setTimeout(async () => {
            await interaction.channel.delete('Bilet kapatıldı.').catch(err => console.error("Kanal silme hatası:", err));
        }, 5000);
    }
};
