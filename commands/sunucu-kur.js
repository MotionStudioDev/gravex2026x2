const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

// --- GENİŞLETİLMİŞ SUNUCU ŞABLONU ---

const ROLES = [
    { name: 'Kurucu', color: '#e74c3c', permissions: [PermissionsBitField.Flags.Administrator], hoist: true },
    { name: 'Yönetim', color: '#e67e22', permissions: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageRoles, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers], hoist: true },
    { name: 'Geliştirici', color: '#9b59b6', permissions: [], hoist: true },
    { name: 'Moderatör', color: '#f1c40f', permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers], hoist: true },
    { name: 'VIP Üye', color: '#3498db', permissions: [] },
    { name: 'Üye', color: '#2ecc71', permissions: [] },
    { name: 'Botlar', color: '#7289da', permissions: [PermissionsBitField.Flags.ViewChannel] },
];

const CATEGORIES = [
    { 
        name: '— GİRİŞ & BİLGİ —', 
        channels: [
            { name: '#👋-hoş-geldin', type: ChannelType.GuildText },
            { name: '#📝-kurallar', type: ChannelType.GuildText },
            { name: '#📢-duyurular', type: ChannelType.GuildText },
            { name: '#🔗-sosyal-medya', type: ChannelType.GuildText },
        ] 
    },
    { 
        name: '— TOPLULUK SOHBETİ —', 
        channels: [
            { name: '#💬-genel-sohbet', type: ChannelType.GuildText },
            { name: '#🤖-bot-komut', type: ChannelType.GuildText },
            { name: '#🖼️-medya-paylaşım', type: ChannelType.GuildText },
            { name: '#💡-öneri-şikayet', type: ChannelType.GuildText },
        ] 
    },
    { 
        name: '— SES KANALLARI —', 
        channels: [
            { name: '#🔊-genel-lounge', type: ChannelType.GuildVoice },
            { name: '#🎤-muhabbet-odası', type: ChannelType.GuildVoice },
        ] 
    },
    { 
        name: '— ÖZEL ERİŞİM —', 
        channels: [
            // Bu kanala sadece 'VIP Üye' ve üstü erişebilir
            { name: '#⭐-vip-lounge', type: ChannelType.GuildText, permissionOverwrites: (guild, roles) => ([
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // Herkese kapat
                { id: roles['VIP Üye'].id, allow: [PermissionsBitField.Flags.ViewChannel] }, // VIP'e aç
                { id: roles['Yönetim'].id, allow: [PermissionsBitField.Flags.ViewChannel] },
                { id: roles['Kurucu'].id, allow: [PermissionsBitField.Flags.ViewChannel] },
            ])},
        ] 
    },
    { 
        name: '— YÖNETİM & LOGS —', 
        channels: [
            // Bu kategoriye sadece 'Moderatör' ve üstü erişebilir
            { 
                name: '#🚨-mod-log', 
                type: ChannelType.GuildText, 
                permissionOverwrites: (guild, roles) => ([
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // Herkese kapat
                    { id: roles['Moderatör'].id, allow: [PermissionsBitField.Flags.ViewChannel] }, // Mod'a aç
                ])
            },
            { 
                name: '#🛠️-yönetim-sohbet', 
                type: ChannelType.GuildText, 
                permissionOverwrites: (guild, roles) => ([
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: roles['Yönetim'].id, allow: [PermissionsBitField.Flags.ViewChannel] },
                ])
            },
            { name: '#⚙️-admin-ses', type: ChannelType.GuildVoice },
        ] 
    }
];

// --- MODÜL BAŞLANGICI ---

module.exports.run = async (client, message, args) => {
    
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('🚫 Yetki Yok')
            .setDescription('Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın.');
        return message.channel.send({ embeds: [embed] });
    }
    
    // --- ONAY AŞAMASI (Önceki kod ile aynı mantık) ---
    const onayEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('⚠️ YÜKSEK SEVİYE KURULUM ONAYI GEREKLİ')
        .setDescription(`
        **DİKKAT!** Bu işlem sunucunuzdaki mevcut yapının **yanına** yeni, detaylı bir kurumsal yapı kuracaktır.

        Bu işlemi onaylıyor musunuz?
        
        *Lütfen bu işlemden sonra sunucu ayarlarınızdan izinleri kontrol edin.*
        `)
        .addFields(
            { name: 'Oluşturulacak Rol Sayısı', value: `${ROLES.length} rol`, inline: true },
            { name: 'Oluşturulacak Kategori Sayısı', value: `${CATEGORIES.length} kategori`, inline: true },
            { name: 'Oluşturulacak Kanal Sayısı', value: `${CATEGORIES.reduce((acc, cat) => acc + cat.channels.length, 0)} kanal`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Onaylamak için 30 saniyeniz var. İşlem iptal edilemez!' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pro_setup_onay').setLabel('✅ BAŞLAT').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('pro_setup_reddet').setLabel('❌ İPTAL ET').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [onayEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.customId.startsWith('pro_setup_'),
        time: 30000 
    });

    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'Bu butonları sadece işlemi başlatan yetkili kullanabilir.', ephemeral: true });
        }

        collector.stop(); 

        if (i.customId === 'pro_setup_onay') {
            await i.update({ 
                embeds: [new EmbedBuilder().setColor('Yellow').setTitle('🔄 Sunucu Yapılandırması Başlatılıyor...').setDescription('Kanallar ve roller oluşturuluyor.')], 
                components: [] 
            });

            const guild = message.guild;
            let totalCreated = 0;
            const createdRoles = {}; // İzinleri ayarlarken kullanmak için rolleri tutacağız

            try {
                // 1. ROLLERİ OLUŞTURMA
                for (const roleData of ROLES) {
                    const newRole = await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        permissions: roleData.permissions,
                        hoist: roleData.hoist || false, // Hoist: Rolü üyelerden ayrı göster
                        reason: `Pro Kurulum: ${message.author.tag}`,
                    });
                    createdRoles[roleData.name] = newRole; // Rolü Map'e kaydet
                    totalCreated++;
                }

                // 2. KATEGORİ VE KANALLARI OLUŞTURMA
                for (const categoryData of CATEGORIES) {
                    const newCategory = await guild.channels.create({
                        name: categoryData.name,
                        type: ChannelType.GuildCategory,
                        reason: 'Pro Sunucu Kurulumu'
                    });
                    totalCreated++;

                    for (const channelData of categoryData.channels) {
                        
                        let permissionOverwrites = [];
                        
                        // Eğer permissionOverwrites fonksiyonu tanımlıysa (Özel erişim kanalları)
                        if (channelData.permissionOverwrites) {
                            permissionOverwrites = channelData.permissionOverwrites(guild, createdRoles);
                        }
                        
                        await guild.channels.create({
                            name: channelData.name,
                            type: channelData.type,
                            parent: newCategory.id,
                            permissionOverwrites: permissionOverwrites, // İzinleri uygula
                            reason: 'Pro Sunucu Kurulumu'
                        });
                        totalCreated++;
                    }
                }
                
                // --- İŞLEM SONUÇLANDI ---
                const finalEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ KURUMSAL KURULUM BAŞARILI')
                    .setDescription(`
                    Sunucunuzun **kurumsal yapısı** başarıyla oluşturuldu!
                    
                    **Toplam Oluşturulan Öğe:** **${totalCreated}**
                    
                    **ÖNEMLİ:** Lütfen 'ÖZEL ERİŞİM' kategorisindeki kanalların izinlerini kontrol edin.
                    `)
                    .addFields(
                        { name: 'Oluşturulan Roller', value: Object.keys(createdRoles).join(', '), inline: false }
                    )
                    .setFooter({ text: `${message.author.tag} tarafından kuruldu.` });

                await msg.edit({ embeds: [finalEmbed] });

            } catch (error) {
                // Kurulum sırasında genel hata
                console.error("Pro Sunucu Kurulum Hatası:", error);
                const errorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('❌ Kritik Kurulum Hatası')
                    .setDescription('Kurulum sırasında beklenmedik bir hata oluştu. Botun **en yüksek rol pozisyonunda** olduğundan ve yeterli yetkiye sahip olduğundan emin olun.')
                    .addFields({ name: 'Hata Mesajı', value: `\`\`\`${error.message.substring(0, 500)}\`\`\`` });

                await msg.edit({ embeds: [errorEmbed] });
            }

        } else if (i.customId === 'pro_setup_reddet') {
            const rejectEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ İşlem İptal Edildi')
                .setDescription(`Kurumsal kurulum işlemi ${message.author} tarafından **iptal edildi**.`);
            
            await i.update({ embeds: [rejectEmbed], components: [] });
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('Grey')
                .setTitle('⏱️ İşlem Zaman Aşımı')
                .setDescription('Onay süresi dolduğu için kurulum otomatik olarak iptal edildi.');
            
            const disabledRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(row.components[0]).setDisabled(true),
                ButtonBuilder.from(row.components[1]).setDisabled(true)
            );
            await msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['server-pro', 'pro-kurulum', 'profosyonel-kur']
};

module.exports.help = {
    name: 'sunucu-kur-pro',
    description: 'Yüksek hiyerarşi ve özel erişim kanalları içeren profesyonel bir sunucu yapısı kurar.'
};
