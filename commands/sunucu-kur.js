const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

// --- Sunucu Şablonu Tanımları ---
const ROLES = [
    { name: 'Yönetici', color: '#e74c3c', permissions: [PermissionsBitField.Flags.Administrator] },
    { name: 'Moderatör', color: '#f1c40f', permissions: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.KickMembers] },
    { name: 'Üye', color: '#2ecc71', permissions: [] },
];

const CATEGORIES = [
    { 
        name: '— BİLGİ —', 
        channels: [
            { name: '#📝-kurallar', type: ChannelType.GuildText },
            { name: '#📢-duyurular', type: ChannelType.GuildText },
        ] 
    },
    { 
        name: '— GENEL —', 
        channels: [
            { name: '#💬-genel-sohbet', type: ChannelType.GuildText },
            { name: '#🖼️-medya', type: ChannelType.GuildText },
            { name: '#🔊-genel-ses', type: ChannelType.GuildVoice },
        ] 
    },
    { 
        name: '— YÖNETİM —', 
        channels: [
            { name: '#🚨-mod-log', type: ChannelType.GuildText },
            { name: '#🛠️-komut-odası', type: ChannelType.GuildText },
            { name: '#🎤-yönetim-ses', type: ChannelType.GuildVoice },
        ] 
    }
];

module.exports.run = async (client, message, args) => {
    
    // --- YETKİ KONTROLÜ (Kurulum için Yüksek Yetki Gerekir) ---
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('🚫 Yetki Yok')
            .setDescription('Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın.');
        return message.channel.send({ embeds: [embed] });
    }
    
    // --- ONAY AŞAMASI ---
    const onayEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('⚠️ SUNUCU KURULUM ONAYI GEREKLİ')
        .setDescription(`
        **DİKKAT!** Bu işlem, sunucunuzdaki **mevcut kanalları, kategorileri ve rolleri silmeyecektir** ancak üzerine yeni bir yapı kuracaktır.

        Bu işlemi onaylıyor musunuz?
        
        *İşlem tamamlandığında ${message.guild.name} sunucusu aşağıdaki yapıya sahip olacaktır.*
        `)
        .addFields(
            { name: 'Oluşturulacak Rol Sayısı', value: `${ROLES.length} rol`, inline: true },
            { name: 'Oluşturulacak Kategori Sayısı', value: `${CATEGORIES.length} kategori`, inline: true },
            { name: 'Oluşturulacak Kanal Sayısı', value: `${CATEGORIES.reduce((acc, cat) => acc + cat.channels.length, 0)} kanal`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Onaylamak için 30 saniyeniz var.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('server_setup_onay').setLabel('✅ KURULUMU BAŞLAT').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('server_setup_reddet').setLabel('❌ İPTAL ET').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [onayEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.customId.startsWith('server_setup_'),
        time: 30000 
    });

    collector.on('collect', async i => {
        // Sadece komutu kullanan yetkilinin butonlara basmasını sağla
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'Bu butonları sadece işlemi başlatan yetkili kullanabilir.', ephemeral: true });
        }

        collector.stop(); // Onay veya Red işlemi yapıldıysa dinlemeyi durdur

        if (i.customId === 'server_setup_onay') {
            await i.update({ 
                embeds: [new EmbedBuilder().setColor('Yellow').setTitle('🔄 Sunucu Yapılandırması Başlatılıyor...').setDescription('Kanallar ve roller oluşturuluyor.')], 
                components: [] 
            });

            const guild = message.guild;
            let totalCreated = 0;
            const log = [];

            try {
                // 1. ROLLERİ OLUŞTURMA
                for (const roleData of ROLES) {
                    const newRole = await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        permissions: roleData.permissions,
                        reason: `${message.author.tag} tarafından sunucu kurulumu yapılıyor.`,
                    });
                    log.push(`✅ Rol Oluşturuldu: ${newRole.name}`);
                    totalCreated++;
                    // Botun rolünü yeni rolleri yönetebilecek şekilde güncelleyebiliriz (opsiyonel)
                }

                // 2. KATEGORİ VE KANALLARI OLUŞTURMA
                for (const categoryData of CATEGORIES) {
                    const newCategory = await guild.channels.create({
                        name: categoryData.name,
                        type: ChannelType.GuildCategory,
                        reason: 'Sunucu Kurulumu'
                    });
                    log.push(`\n📁 Kategori Oluşturuldu: ${newCategory.name}`);
                    totalCreated++;

                    for (const channelData of categoryData.channels) {
                        const newChannel = await guild.channels.create({
                            name: channelData.name,
                            type: channelData.type,
                            parent: newCategory.id,
                            reason: 'Sunucu Kurulumu'
                        });
                        log.push(`  → Kanal Oluşturuldu: ${newChannel.name}`);
                        totalCreated++;
                    }
                }
                
                // --- İŞLEM SONUÇLANDI ---
                const finalEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ SUNUCU KURULUMU BAŞARILI')
                    .setDescription(`
                    Sunucunuzun temel yapısı başarıyla oluşturuldu!
                    
                    **Toplam Oluşturulan Öğe:** **${totalCreated}**
                    `)
                    .addFields(
                        { name: 'Oluşturulan Roller', value: ROLES.map(r => r.name).join(', '), inline: false },
                        { name: 'Oluşturulan Kategoriler', value: CATEGORIES.map(c => c.name).join(', '), inline: false }
                    )
                    .setFooter({ text: `${message.author.tag} tarafından kuruldu.` });

                await msg.edit({ embeds: [finalEmbed] });

            } catch (error) {
                // Kurulum sırasında genel hata
                console.error("Sunucu Kurulum Hatası:", error);
                const errorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('❌ Kurulum Hatası')
                    .setDescription('Kurulum sırasında beklenmedik bir hata oluştu. Lütfen botun yetkilerini kontrol edin (özellikle en yüksek rol pozisyonunu).')
                    .addFields({ name: 'Hata Mesajı', value: `\`\`\`${error.message.substring(0, 500)}\`\`\`` });

                await msg.edit({ embeds: [errorEmbed] });
            }

        } else if (i.customId === 'server_setup_reddet') {
            const rejectEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ İşlem İptal Edildi')
                .setDescription(`${message.author} işlemi **iptal etmeyi** seçti. Sunucu kurulumu başlamadı.`);
            
            await i.update({ embeds: [rejectEmbed], components: [] });
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('Grey')
                .setTitle('⏱️ İşlem Zaman Aşımı')
                .setDescription('Onay süresi dolduğu için sunucu kurulumu otomatik olarak iptal edildi.');
            
            // Butonları devre dışı bırak
            const disabledRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(row.components[0]).setDisabled(true),
                ButtonBuilder.from(row.components[1]).setDisabled(true)
            );
            await msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['server-setup', 'kurulum', 'hazir-sunucu']
};

module.exports.help = {
    name: 'sunucu-kur',
    description: 'Hazır bir sunucu yapısını (roller, kanallar) tek tuşla kurar.'
};
