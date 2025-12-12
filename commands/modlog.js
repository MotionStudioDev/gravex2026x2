const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField, 
    ChannelSelectMenuBuilder, 
    ChannelType,
    ComponentType 
} = require('discord.js');
const ModLog = require('../models/modlog');

module.exports.run = async (client, message, args) => {
    // 1. YETKİ KONTROLÜ
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ 
            embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın!')] 
        });
    }

    // 2. MEVCUT VERİYİ ÇEK
    let data = await ModLog.findOne({ guildID: message.guild.id });
    
    // --- YARDIMCI FONKSİYON: Dashboard Mesajını Oluşturur ---
    const getDashboard = (currentData) => {
        const currentChannelID = currentData ? currentData.logChannelID : null;
        const currentChannel = currentChannelID ? message.guild.channels.cache.get(currentChannelID) : null;
        
        const statusEmoji = currentChannel ? '🟢' : '🔴';
        const channelText = currentChannel ? `${currentChannel} (\`${currentChannel.id}\`)` : 'Ayarlanmamış';

        const embed = new EmbedBuilder()
            .setColor(currentChannel ? '#57F287' : '#ED4245')
            .setTitle('🛡️ Mod-Log Sistemi Yapılandırması')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setDescription('Denetim kayıtlarının gönderileceği kanalı aşağıdaki listeden seçebilirsiniz. Kanallar kategorilere göre listelenmektedir.')
            .addFields(
                { name: '📊 Sistem Durumu', value: `\` ${statusEmoji} ${currentChannel ? 'Aktif' : 'Devre Dışı'} \``, inline: true },
                { name: '📢 Mevcut Kanal', value: channelText, inline: true }
            )
            .setFooter({ text: 'Seçim yapmak için menüyü, ayarları yönetmek için butonları kullanın.' })
            .setTimestamp();

        // Kanal Seçme Menüsü
        const selectMenu = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('select_modlog_channel')
                .setPlaceholder('Bir kanal seçin...')
                .setChannelTypes(ChannelType.GuildText) // Sadece yazı kanallarını gösterir
                .setMaxValues(1)
                .setMinValues(1)
        );

        // Butonlar
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_modlog_reset')
                .setLabel('Sistemi Sıfırla')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
                .setDisabled(!currentChannel),
            
            new ButtonBuilder()
                .setCustomId('btn_modlog_close')
                .setLabel('Paneli Kapat')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

        return { embeds: [embed], components: [selectMenu, buttons] };
    };

    // 3. PANELİ GÖNDER
    const msg = await message.channel.send(getDashboard(data));

    // 4. COLLECTOR (MENÜ VE BUTON DİNLEYİCİ)
    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 120000 }); // 2 dakika aktif

    collector.on('collect', async interaction => {
        
        // --- MENÜ: KANAL SEÇİLDİĞİNDE ---
        if (interaction.customId === 'select_modlog_channel') {
            const selectedChannelID = interaction.values[0];
            const targetChannel = message.guild.channels.cache.get(selectedChannelID);

            data = await ModLog.findOneAndUpdate(
                { guildID: message.guild.id },
                { logChannelID: selectedChannelID },
                { upsert: true, new: true }
            );

            await interaction.update(getDashboard(data));
            await message.channel.send({ content: `✅ Mod-Log kanalı ${targetChannel} olarak güncellendi.` }).then(m => setTimeout(() => m.delete(), 4000));
        }

        // --- BUTON: SIFIRLA ---
        if (interaction.customId === 'btn_modlog_reset') {
            await ModLog.findOneAndDelete({ guildID: message.guild.id });
            data = null;
            
            await interaction.update(getDashboard(null));
            await message.channel.send({ content: `🗑️ Mod-Log sistemi bu sunucuda devre dışı bırakıldı.` }).then(m => setTimeout(() => m.delete(), 4000));
        }

        // --- BUTON: KAPAT ---
        if (interaction.customId === 'btn_modlog_close') {
            await interaction.update({ content: '🔒 Ayarlar kaydedildi ve panel kapatıldı.', embeds: [], components: [] });
            collector.stop();
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const disabledRows = msg.components.map(row => {
                const newRow = ActionRowBuilder.from(row);
                newRow.components.forEach(c => c.setDisabled(true));
                return newRow;
            });
            await msg.edit({ components: disabledRows }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['log-ayarla', 'mod-log']
};

module.exports.help = {
    name: 'modlog'
};
