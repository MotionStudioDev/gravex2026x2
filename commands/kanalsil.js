const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');

module.exports.run = async (client, message, args) => {
    try {
        // Yetki kontrolü (Yönetici veya Kanalları Yönet)
        const requiredPermissions = [PermissionsBitField.Flags.Administrator, PermissionsBitField.Flags.ManageChannels];
        if (!message.member.permissions.has(requiredPermissions)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Yetki Hatası')
                        .setDescription('Bu komutu sadece **Yönetici** veya **Kanalları Yönet** yetkisine sahip olanlar kullanabilir.')
                ],
                ephemeral: true
            });
        }

        if (!args[0]) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Kullanım Hatası')
                        .setDescription('Doğru kullanım: `g!kanalsil <#kanal | kanal-id>`')
                ],
                ephemeral: true
            });
        }

        // Kanalı bul
        let kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

        if (!kanal) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Kanal Bulunamadı')
                        .setDescription('Belirtilen kanal bulunamadı. Lütfen geçerli bir kanal ID veya #kanal belirtin.')
                ],
                ephemeral: true
            });
        }

        // Botun silme yetkisini kontrol et
        if (!kanal.deletable) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Bot Yetkisi Eksik')
                        .setDescription('Bu kanalı silmeye yetkim yok. Rol hiyerarşimi veya **Kanalları Yönet** yetkimi kontrol edin.')
                ],
                ephemeral: true
            });
        }

        // Kanal tipini Türkçe olarak belirleme
        const getChannelTypeName = (type) => {
            switch (type) {
                case ChannelType.GuildText: return 'Metin Kanalı';
                case ChannelType.GuildVoice: return 'Ses Kanalı';
                case ChannelType.GuildCategory: return 'Kategori';
                case ChannelType.GuildAnnouncement: return 'Duyuru Kanalı';
                default: return 'Bilinmeyen Tip';
            }
        };
        
        // Onay embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('⚠️ Kanal Silme Onayı Gerekiyor!')
            .setDescription(`Aşağıdaki kanalı **kalıcı olarak** silmek üzeresiniz:\n\n` +
                            `Kanal Adı: **${kanal.name}**\n` +
                            `Kanal Tipi: **${getChannelTypeName(kanal.type)}**\n` +
                            `Kategori: **${kanal.parent ? kanal.parent.name : 'Yok'}**\n\n` +
                            `Bu işlem geri alınamaz. Onaylıyor musunuz?`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_delete').setLabel('✅ Onaylıyorum (Sil)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cancel_delete').setLabel('❌ İptal Et').setStyle(ButtonStyle.Danger)
        );

        const msg = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000
        });

        collector.on('collect', async i => {
            if (i.customId === 'confirm_delete') {
                try {
                    await kanal.delete(`Silme işlemi ${message.author.tag} tarafından onaylandı.`);
                    
                    const doneEmbed = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('✅ Kanal Silindi')
                        .setDescription(`Kanal başarıyla silindi: **#${kanal.name}**`); // Kanal zaten silindiği için mention yerine sadece adını kullanıyoruz

                    await i.update({ embeds: [doneEmbed], components: [] });
                } catch (err) {
                    console.error('Kanal silme hatası:', err);
                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Hata')
                                .setDescription('Kanal silinirken bir hata oluştu. Lütfen botun yetkilerini kontrol edin.')
                        ],
                        components: []
                    });
                }
                collector.stop();
            }

            if (i.customId === 'cancel_delete') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('⚠️ İşlem İptal Edildi')
                    .setDescription('Kanal silme işlemi kullanıcı onayı ile iptal edildi.');

                await i.update({ embeds: [cancelEmbed], components: [] });
                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
             // Zaman aşımı durumunda butonları devre dışı bırak
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
             // İşlem tamamlandıysa/iptal edildiyse, collector.on('collect') içinde zaten devre dışı bırakıldı.
        });
    } catch (err) {
        console.error('kanalsil komutu genel hatası:', err);
        message.channel.send('⚠️ | Kanal silme sırasında beklenmedik bir hata oluştu.');
    }
};

module.exports.conf = { aliases: ['channeldelete', 'kanalsil'] };
module.exports.help = { name: 'kanalsil' };
