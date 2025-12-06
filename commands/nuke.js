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

        // --- 2. Birinci Onay (Embed ve Butonlar) ---
        const confirmEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('⚠️ KRİTİK UYARI: SUNUCU SIFIRLAMA İŞLEMİ')
            .setDescription(`**Büyük bir felaketin eşiğindesiniz!**\n\n` +
                            `Bu işlem, **Sunucudaki tüm kanalları** (Metin, Ses ve Kategoriler) silip, yerlerine sadece bir adet yeni metin kanalı (**#nuked-by-g** adı altında) oluşturacaktır.\n\n` +
                            `**BU İŞLEM GERİ ALINAMAZ.**\n\n` +
                            `Gerçekten devam etmek istiyor musunuz?`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nuke_confirm_step1').setLabel('🔥 EVET, SIFIRLA!').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('nuke_cancel').setLabel('🛡️ İPTAL ET, Vazgeçtim').setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000 // 60 saniye süre
        });

        // --- 3. Buton Etkileşimi Yönetimi ---
        collector.on('collect', async i => {
            // İptal Butonu
            if (i.customId === 'nuke_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('✅ İşlem İptal Edildi')
                    .setDescription('Sunucu sıfırlama işlemi iptal edildi. Sunucunuz güvende.');
                
                await i.update({ embeds: [cancelEmbed], components: [] });
                return collector.stop();
            }

            // Birinci Onay (Devam Et) Butonu
            if (i.customId === 'nuke_confirm_step1') {
                collector.stop(); // İlk kolektörü durdur
                
                // --- İkinci Onay (Son Güvenlik Adımı) ---
                const finalConfirmEmbed = new EmbedBuilder()
                    .setColor('#992D22')
                    .setTitle('❗ SON UYARI: EYLEMİ KİLİTLE')
                    .setDescription(`**Bu senin son şansın.** İşlemi **tekrar** onaylayarak sunucuyu sıfırlamayı kilitliyorsunuz.\n\n` +
                                    `Emin misiniz?`);
                
                const finalRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('nuke_final_confirm').setLabel('💣 KİLİTLE ve SIFIRLA!').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('nuke_final_cancel').setLabel('↩️ İptal').setStyle(ButtonStyle.Secondary)
                );
                
                await i.update({ embeds: [finalConfirmEmbed], components: [finalRow] });

                // Yeni bir kolektör oluştur (İkinci onay için)
                const finalCollector = msg.createMessageComponentCollector({
                    filter: finalI => finalI.user.id === message.author.id,
                    time: 30000 
                });

                finalCollector.on('collect', async finalI => {
                    finalCollector.stop();

                    if (finalI.customId === 'nuke_final_cancel') {
                        const finalCancelEmbed = new EmbedBuilder()
                            .setColor('#FEE75C')
                            .setTitle('✅ İşlem İptal Edildi')
                            .setDescription('İkinci onay adımında vazgeçildi. Sunucunuz sıfırlanmadı.');
                        return finalI.update({ embeds: [finalCancelEmbed], components: [] });
                    }

                    if (finalI.customId === 'nuke_final_confirm') {
                        await finalI.update({ components: [] }); // Butonları hemen kaldır

                        // --- KANAL SİLME VE YENİDEN OLUŞTURMA İŞLEMİ ---
                        const guild = message.guild;
                        const channelPromises = [];

                        // Tüm kanalları silme sözlerini toplama
                        for (const [id, channel] of guild.channels.cache) {
                             if (channel.deletable) {
                                channelPromises.push(channel.delete().catch(err => console.error(`Kanal silinirken hata: ${channel.name}`, err)));
                            }
                        }

                        // Tüm silme işlemlerinin bitmesini bekle
                        await Promise.all(channelPromises);

                        // Yeni Nuke Kanalını Oluşturma
                        const newChannel = await guild.channels.create({
                            name: 'nuked-by-g',
                            type: ChannelType.GuildText,
                            reason: `Sunucu ${message.author.tag} tarafından sıfırlandı (Nuke Komutu).`
                        }).catch(err => console.error('Yeni kanal oluşturma hatası:', err));

                        // Başarılı embed'i oluşturma ve gönderme
                        const successEmbed = new EmbedBuilder()
                            .setColor('#3498DB')
                            .setTitle('💣 SUNUCU BAŞARIYLA SIFIRLANDI!')
                            .setDescription('Tüm eski kanallar silindi ve sunucu sıfırlandı.')
                            .addFields({ name: 'İşlemi Yapan', value: `${message.author.tag} (${message.author.id})`, inline: true })
                            .setFooter({ text: 'Yine de eski kanalların yedeği alınmadıysa geri getirilemez.' });

                        if (newChannel) {
                            newChannel.send({ embeds: [successEmbed] });
                            // İlk mesajı, yeni kanalda silmeye gerek yok.
                        }
                    }
                });
            }
        });
        
        // --- 4. Zaman Aşımı Kontrolü (İlk Kolektör) ---
        collector.on('end', async (collected, reason) => {
             if (reason === 'time') {
                try {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#FEE75C')
                        .setTitle('⏳ Zaman Aşımı')
                        .setDescription('Onay süresi dolduğu için işlem iptal edildi. Sunucunuz sıfırlanmadı.');

                    const disabledRow = new ActionRowBuilder().addComponents(
                        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                    );
                    await msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
                } catch {}
             }
        });

    } catch (err) {
        console.error('Nuke komutu genel hatası:', err);
        message.channel.send('⚠️ | Nuke işlemi sırasında beklenmedik bir hata oluştu.');
    }
};

module.exports.conf = { aliases: ['serverwipe', 'resetserver', 'nukla'] };
module.exports.help = { name: 'nuke' };
