const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');

module.exports.run = async (client, message, args) => {
    try {
        // --- 1. Yetki Kontrolü ---
        // Sadece Yönetici yetkisine sahip kullanıcılar kullanabilir.
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Kritik Yetki Hatası')
                        .setDescription('Bu komut sadece **Yönetici (Administrator)** yetkisine sahip olanlar tarafından kullanılabilir. Geri dönüşü olmayan bir işlemdir.')
                ],
                ephemeral: true
            });
        }
        
        // Kanalın silinebilir olup olmadığını kontrol et
        const targetChannel = message.channel;
        if (!targetChannel.deletable) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Bot Yetkisi Eksik')
                        .setDescription(`Bu kanalı (**#${targetChannel.name}**) silmeye yetkim yok. Rol hiyerarşimi veya **Kanalları Yönet** yetkimi kontrol edin.`)
                ],
                ephemeral: true
            });
        }

        // --- 2. Birinci Onay (Embed ve Butonlar) ---
        const confirmEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('⚠️ KANAL SIFIRLAMA ONAYI')
            .setDescription(`Bu işlem, **#${targetChannel.name}** kanalını silip, **aynı isim ve ayarlarla** yerine yenisini oluşturacaktır. Kanalın tüm geçmişi, izinleri ve webhook'ları sıfırlanacaktır.\n\n` +
                            `**BU İŞLEM GERİ ALINAMAZ.**\n\n` +
                            `Devam etmek istiyor musunuz?`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nuke_confirm_step1').setLabel('🔥 EVET, KANALI SIFIRLA!').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('nuke_cancel').setLabel('🛡️ İPTAL ET').setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000 // 30 saniye süre
        });

        // --- 3. Buton Etkileşimi Yönetimi ---
        collector.on('collect', async i => {
            // İptal Butonu
            if (i.customId === 'nuke_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('✅ İşlem İptal Edildi')
                    .setDescription('Kanal sıfırlama işlemi iptal edildi.');
                
                await i.update({ embeds: [cancelEmbed], components: [] });
                return collector.stop();
            }

            // Birinci Onay (Devam Et) Butonu
            if (i.customId === 'nuke_confirm_step1') {
                collector.stop(); // İlk kolektörü durdur
                
                // --- KANAL SIFIRLAMA İŞLEMİ ---
                
                // Kanalın özelliklerini kaydet
                const channelOptions = {
                    name: targetChannel.name,
                    type: targetChannel.type,
                    parent: targetChannel.parent,
                    permissionOverwrites: targetChannel.permissionOverwrites.cache,
                    position: targetChannel.position,
                    topic: targetChannel.topic,
                    nsfw: targetChannel.nsfw,
                    rateLimitPerUser: targetChannel.rateLimitPerUser,
                    reason: `Kanal, ${message.author.tag} tarafından sıfırlandı (Nuke Komutu).`
                };

                // Kanalı sil
                await targetChannel.delete();

                // Yeni Kanalı Oluştur
                const newChannel = await targetChannel.guild.channels.create(channelOptions)
                    .catch(err => console.error('Yeni kanal oluşturma hatası:', err));

                if (!newChannel) {
                    return message.channel.send('❌ | Yeni kanal oluşturulurken kritik bir hata oluştu.');
                }
                
                // Başarılı embed'i oluşturma ve gönderme
                const successEmbed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('💥 KANAL BAŞARIYLA SIFIRLANDI (NUKED)')
                    .setDescription(`**#${channelOptions.name}** kanalı başarıyla silindi ve yeniden oluşturuldu.`)
                    .addFields({ name: 'İşlemi Yapan', value: `${message.author.tag}`, inline: true })
                    .setFooter({ text: 'Kanalın tüm geçmişi temizlenmiştir.' });

                // Yeni kanalda mesajı gönderme
                if (newChannel) {
                    newChannel.send({ embeds: [successEmbed] });
                }
            }
        });
        
        // --- 4. Zaman Aşımı Kontrolü ---
        collector.on('end', async (collected, reason) => {
             if (reason === 'time') {
                try {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#FEE75C')
                        .setTitle('⏳ Zaman Aşımı')
                        .setDescription('Onay süresi dolduğu için işlem iptal edildi.');

                    const disabledRow = new ActionRowBuilder().addComponents(
                        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                    );
                    await msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
                } catch {}
             }
        });

    } catch (err) {
        console.error('Kanal Nuke komutu genel hatası:', err);
        message.channel.send('⚠️ | Kanal sıfırlama sırasında beklenmedik bir hata oluştu.');
    }
};

module.exports.conf = { aliases: ['nukechannel', 'resetc'] };
module.exports.help = { name: 'nuke' };
