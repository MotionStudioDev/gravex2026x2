const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    RoleSelectMenuBuilder, 
    ChannelType, 
    ComponentType, 
    PermissionsBitField 
} = require('discord.js');
const TicketSettings = require('../models/TicketSettings');

module.exports.run = async (client, message, args) => {
    
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın.");
    }

    // --- ADIM 1: BAŞLANGIÇ PANELİ (Görseldeki Tasarım) ---
    const startEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎫 Grave Ticket Sistemi Kurulumu')
        .setDescription('Sistemi kurmak için aşağıdaki adımları izleyin.');

    const startRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('start_setup_auto')
            .setLabel('Sistemi Aktif Et')
            .setStyle(ButtonStyle.Success)
    );

    const mainMsg = await message.channel.send({ embeds: [startEmbed], components: [startRow] });

    const collector = mainMsg.createMessageComponentCollector({ 
        filter: (i) => i.user.id === message.author.id,
        time: 120000 
    });

    collector.on('collect', async (i) => {
        
        // --- ADIM 2: BUTONA BASILDIĞINDA KATEGORİ OLUŞTUR VE ROL SOR ---
        if (i.customId === 'start_setup_auto') {
            await i.deferUpdate();

            try {
                // Kategoriyi otomatik oluştur/bul
                let category = i.guild.channels.cache.find(c => c.name === "GRAVE TICKETS" && c.type === ChannelType.GuildCategory);
                if (!category) {
                    category = await i.guild.channels.create({
                        name: "GRAVE TICKETS",
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [{ id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
                    });
                }

                // Rol seçim menüsünü gönder
                const roleEmbed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle('📍 Adım 2: Yetkili Rolü Seçimi')
                    .setDescription('✅ Kategori oluşturuldu.\n\nŞimdi biletleri yönetecek **Yetkili Rolünü** aşağıdan seçin.');

                const roleMenu = new RoleSelectMenuBuilder()
                    .setCustomId('setup_role_select')
                    .setPlaceholder('Bir rol seçiniz...');

                await i.editReply({ 
                    embeds: [roleEmbed], 
                    components: [new ActionRowBuilder().addComponents(roleMenu)] 
                });

            } catch (err) {
                console.error(err);
                await i.followUp({ content: '❌ Kategori oluşturulurken hata oluştu!', ephemeral: true });
            }
        }

        // --- ADIM 3: ROL SEÇİLDİĞİNDE KAYDET VE BİTİR ---
        if (i.isRoleSelectMenu() && i.customId === 'setup_role_select') {
            await i.deferUpdate();

            const selectedRoleId = i.values[0];
            const category = i.guild.channels.cache.find(c => c.name === "GRAVE TICKETS");

            // Veritabanına hem kategoriyi hem rolü kaydet
            await TicketSettings.findOneAndUpdate(
                { guildId: i.guildId },
                { 
                    categoryId: category.id,
                    staffRoleId: selectedRoleId 
                },
                { upsert: true }
            );

            // Başarı mesajı
            await i.editReply({ 
                content: '✅ **Kurulum Tamamlandı!** Kategori ve Yetkili Rolü ayarlandı.', 
                embeds: [], 
                components: [] 
            });

            // --- FİNAL: BİLET PANELİ ---
            const panelEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('🎫 Destek Talebi')
                .setDescription('Yetkili ekibimizle iletişime geçmek için butona tıklayın.')
                .setFooter({ text: 'Grave Ticket Sistemi' });

            const panelRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket_modal')
                    .setLabel('Talep Oluştur')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Primary)
            );

            await i.channel.send({ embeds: [panelEmbed], components: [panelRow] });
            collector.stop();
        }
    });
};

module.exports.conf = { aliases: ['setup', 'kur'] };
module.exports.help = { name: 'ticket-sistemi' };
