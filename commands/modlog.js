const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
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
    
    // --- YARDIMCI FONKSİYON: Embed ve Butonları Oluşturur ---
    const getDashboard = (currentData) => {
        const currentChannelID = currentData ? currentData.logChannelID : null;
        const currentChannel = currentChannelID ? message.guild.channels.cache.get(currentChannelID) : null;
        
        const statusEmoji = currentChannel ? '🟢' : '🔴';
        const statusText = currentChannel ? 'Aktif' : 'Devre Dışı';
        const channelText = currentChannel ? `${currentChannel} (\`${currentChannel.id}\`)` : 'Ayarlanmamış';

        const embed = new EmbedBuilder()
            .setColor(currentChannel ? 'Green' : 'Red')
            .setTitle('🛡️ Mod-Log Kontrol Paneli')
            .setDescription(`Bu panelden sunucunun denetim kayıtlarının (log) düşeceği kanalı yönetebilirsiniz.`)
            .addFields(
                { name: '📊 Sistem Durumu', value: `\` ${statusEmoji} ${statusText} \``, inline: true },
                { name: '📢 Mevcut Kanal', value: channelText, inline: true }
            )
            .setFooter({ text: 'Ayarları değiştirmek için aşağıdaki butonları kullanın.' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_modlog_set')
                .setLabel('Kanal Ayarla (Modal)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✏️'),
            
            new ButtonBuilder()
                .setCustomId('btn_modlog_reset')
                .setLabel('Sıfırla')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
                .setDisabled(!currentChannel), // Kanal yoksa sıfırla butonu çalışmaz
            
            new ButtonBuilder()
                .setCustomId('btn_modlog_close')
                .setLabel('Paneli Kapat')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

        return { embeds: [embed], components: [row] };
    };

    // 3. İLK MESAJI GÖNDER
    const msg = await message.channel.send(getDashboard(data));

    // 4. COLLECTOR (BUTON DİNLEYİCİ)
    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 }); // 60 saniye aktif

    collector.on('collect', async interaction => {
        
        // --- BUTON: AYARLA (MODAL AÇAR) ---
        if (interaction.customId === 'btn_modlog_set') {
            const modal = new ModalBuilder()
                .setCustomId('modal_modlog_input')
                .setTitle('Mod-Log Kanal Ayarı');

            const channelInput = new TextInputBuilder()
                .setCustomId('input_channel_id')
                .setLabel("Kanal ID'si giriniz")
                .setPlaceholder('Örn: 123456789012345678')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(channelInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);

            // Modal Cevabını Bekle
            try {
                const modalSubmit = await interaction.awaitModalSubmit({ 
                    filter: (i) => i.customId === 'modal_modlog_input' && i.user.id === message.author.id, 
                    time: 30000 
                });

                const inputVal = modalSubmit.fields.getTextInputValue('input_channel_id');
                // Sadece sayıları al (eğer kullanıcı <#123> yazarsa temizler)
                const cleanID = inputVal.replace(/\D/g, ''); 
                const targetChannel = message.guild.channels.cache.get(cleanID);

                if (!targetChannel) {
                    return modalSubmit.reply({ content: '❌ Geçersiz Kanal ID! Lütfen doğru bir ID girdiğinizden emin olun.', ephemeral: true });
                }

                // Veritabanını Güncelle
                data = await ModLog.findOneAndUpdate(
                    { guildID: message.guild.id },
                    { logChannelID: targetChannel.id },
                    { upsert: true, new: true }
                );

                // Paneli Güncelle
                await modalSubmit.update(getDashboard(data));
                
                // Başarı mesajı (geçici)
                await message.channel.send({ content: `✅ Mod-Log kanalı başarıyla ${targetChannel} olarak ayarlandı!` }).then(m => setTimeout(() => m.delete(), 5000));

            } catch (err) {
                // Modal zaman aşımı vb.
            }
        }

        // --- BUTON: SIFIRLA ---
        if (interaction.customId === 'btn_modlog_reset') {
            await ModLog.findOneAndDelete({ guildID: message.guild.id });
            data = null; // Veriyi yerel olarak da temizle
            
            await interaction.update(getDashboard(null));
            await message.channel.send({ content: `🗑️ Mod-Log sistemi sıfırlandı.` }).then(m => setTimeout(() => m.delete(), 5000));
        }

        // --- BUTON: KAPAT ---
        if (interaction.customId === 'btn_modlog_close') {
            await interaction.update({ content: '🔒 Panel kapatıldı.', embeds: [], components: [] });
            collector.stop();
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            // Süre dolunca butonları devre dışı bırak
            const disabledRow = new ActionRowBuilder().addComponents(
                msg.components[0].components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
            );
            await msg.edit({ components: [disabledRow] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['modlog-ayarla', 'log-sistemi']
};

module.exports.help = {
    name: 'modlog'
};
