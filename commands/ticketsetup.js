const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelSelectMenuBuilder, 
    RoleSelectMenuBuilder, 
    ChannelType, 
    ComponentType, 
    PermissionsBitField 
} = require('discord.js');
const TicketSettings = require('../models/TicketSettings');

module.exports.run = async (client, message, args) => {
    
    // 1. Yetki Kontrolü
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın.");
    }

    // Başlangıç Mesajı
    const setupEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🛠️ Ticket Kurulum Sihirbazı')
        .setDescription('Lütfen açılacak biletlerin oluşturulacağı **KATEGORİYİ** aşağıdaki menüden seçin.')
        .setFooter({ text: 'Kurulum 3 adımdan oluşmaktadır.' });

    const categoryMenu = new ChannelSelectMenuBuilder()
        .setCustomId('setup_category_select')
        .setPlaceholder('Bir Kategori Seçin')
        .setChannelTypes(ChannelType.GuildCategory);

    const row1 = new ActionRowBuilder().addComponents(categoryMenu);

    const msg = await message.channel.send({ embeds: [setupEmbed], components: [row1] });

    // Verileri geçici tutmak için değişkenler
    let selectedCategoryId = null;
    let selectedStaffRoleId = null;

    // Collector Oluştur (Sadece komutu yazan kişi kullanabilsin, 60 sn süre)
    const collector = msg.createMessageComponentCollector({ 
        componentType: ComponentType.ChannelSelect, 
        filter: (i) => i.user.id === message.author.id,
        time: 60000 
    });

    // ====================================================
    // 📍 ADIM 1: KATEGORİ SEÇİMİ
    // ====================================================
    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'setup_category_select') {
            
            // 🛡️ FIX: Unknown Interaction hatasını önleyen kod
            await interaction.deferUpdate(); 

            selectedCategoryId = interaction.values[0];

            // Adım 2'ye geç: Yetkili Rolü Seçimi
            const roleEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('🛠️ Ticket Kurulum: Adım 2')
                .setDescription('✅ Kategori seçildi.\n\nŞimdi lütfen biletleri görebilecek **YETKİLİ ROLÜNÜ** seçin.')
                .setFooter({ text: 'Menüden rol seçiniz.' });

            const roleMenu = new RoleSelectMenuBuilder()
                .setCustomId('setup_role_select')
                .setPlaceholder('Yetkili Rolünü Seçin');

            const row2 = new ActionRowBuilder().addComponents(roleMenu);

            // Mesajı güncelle
            await interaction.editReply({ embeds: [roleEmbed], components: [row2] });

            // Yeni bir collector açıyoruz (Rol seçimi için)
            const roleCollector = msg.createMessageComponentCollector({
                componentType: ComponentType.RoleSelect,
                filter: (i) => i.user.id === message.author.id,
                time: 60000
            });

            // ====================================================
            // 📍 ADIM 2: ROL SEÇİMİ VE KAYIT
            // ====================================================
            roleCollector.on('collect', async (roleInteraction) => {
                if (roleInteraction.customId === 'setup_role_select') {
                    
                    // 🛡️ FIX: İkinci deferUpdate (Hata önleyici)
                    await roleInteraction.deferUpdate();

                    selectedStaffRoleId = roleInteraction.values[0];

                    // Veritabanına Kaydet
                    await TicketSettings.findOneAndUpdate(
                        { guildId: message.guild.id },
                        { 
                            guildId: message.guild.id,
                            categoryId: selectedCategoryId,
                            staffRoleId: selectedStaffRoleId
                        },
                        { upsert: true, new: true }
                    );

                    // Kurulum bitti mesajı
                    await roleInteraction.editReply({ 
                        content: '✅ **Kurulum Tamamlandı!** Ayarlar veritabanına kaydedildi. Panel aşağıya gönderiliyor...', 
                        embeds: [], 
                        components: [] 
                    });

                    // ====================================================
                    // 📍 ADIM 3: PANELİ GÖNDERME
                    // ====================================================
                    const ticketPanelEmbed = new EmbedBuilder()
                        .setColor('Red') // Grave temasına uygun renk
                        .setTitle('🎫 Destek Talebi Oluştur')
                        .setDescription(`
                        Selamlar! Bir sorununuz mu var veya yardıma mı ihtiyacınız var?
                        
                        Aşağıdaki **"Talep Oluştur"** butonuna tıklayarak yetkili ekibimizle iletişime geçebilirsiniz.
                        
                        ⚠️ **Not:** Lütfen gereksiz yere talep açmayınız.
                        `)
                        .setThumbnail(client.user.displayAvatarURL())
                        .setImage('https://dummyimage.com/600x200/2f3136/ffffff&text=Grave+Support') // İstersen buraya banner koyabilirsin
                        .setFooter({ text: 'Grave Ticket System' });

                    const ticketButton = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('open_ticket_modal') // interaction.js ile aynı ID olmak ZORUNDA
                            .setLabel('Talep Oluştur')
                            .setEmoji('📩')
                            .setStyle(ButtonStyle.Success)
                    );

                    await message.channel.send({ embeds: [ticketPanelEmbed], components: [ticketButton] });
                    
                    roleCollector.stop(); // Collectorları durdur
                }
            });
        }
    });

    // Süre dolarsa
    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            msg.edit({ content: '❌ Süre doldu, kurulum iptal edildi.', components: [] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['ticket-kur', 'tsetup']
};

module.exports.help = {
    name: 'ticket-sistemi'
};
