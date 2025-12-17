const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const TicketSettings = require('../models/TicketSettings');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.');
    }

    const settings = await TicketSettings.findOne({ guildId: message.guildId });

    if (!settings) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('Red')
                .setTitle('⚠️ Sistem Bulunamadı')
                .setDescription('Bu sunucuda aktif bir bilet sistemi yok. Önce `g!ticket-sistemi` ile kurulum yapmalısın.')
            ]
        });
    }

    // Mevcut ayarları göster
    let panelStatus = 'Bilinmiyor';
    try {
        const channel = await message.guild.channels.fetch(settings.channelId);
        await channel.messages.fetch(settings.messageId);
        panelStatus = `<#${settings.channelId}> kanalında aktif`;
    } catch {
        panelStatus = 'Panel mesajı silinmiş (sadece ayarlar kaldı)';
    }

    const confirmEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🗑️ Bilet Sistemini Sıfırla')
        .setDescription(
            '**DİKKAT! Bu işlem geri alınamaz.**\n\n' +
            'Bilet sistemi tamamen sıfırlanacak ve aşağıdaki ayarlar silinecek:'
        )
        .addFields(
            { name: 'Talep Kategorisi', value: `<#${settings.categoryId}>`, inline: true },
            { name: 'Yetkili Rol', value: `<@&${settings.staffRoleId}>`, inline: true },
            { name: 'Log Kanalı', value: settings.logChannelId ? `<#${settings.logChannelId}>` : 'Yok', inline: true },
            { name: 'Panel Durumu', value: panelStatus, inline: false }
        )
        .setFooter({ text: 'Onaylarsan tüm ayarlar kalıcı olarak silinecek • 60 saniyen var' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('reset_confirm_yes')
            .setLabel('Evet, Sıfırla')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️'),
        new ButtonBuilder()
            .setCustomId('reset_confirm_no')
            .setLabel('Hayır, İptal Et')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
    );

    const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

    const filter = i => i.user.id === message.author.id;
    const collector = confirmMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'reset_confirm_no') {
            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('Grey')
                    .setDescription('❌ Sıfırlama işlemi iptal edildi. Sistem korunuyor.')
                ],
                components: []
            });
            collector.stop();
            return;
        }

        // ONAY VERİLDİ → SIFIRLA
        await i.deferUpdate();

        await TicketSettings.deleteOne({ guildId: message.guildId });

        await i.editReply({
            embeds: [new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Bilet Sistemi Sıfırlandı!')
                .setDescription(
                    'Tüm ayarlar başarıyla silindi.\n\n' +
                    'Artık `g!ticket-sistemi` komutuyla **yeniden kurulum** yapabilirsin.'
                )
            ],
            components: []
        });

        collector.stop();
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            confirmMsg.edit({
                embeds: [new EmbedBuilder()
                    .setColor('Orange')
                    .setDescription('⏰ Süre doldu, sıfırlama işlemi iptal edildi.')
                ],
                components: []
            }).catch(() => {});
        }
    });
};

module.exports.conf = { aliases: ['ticket-reset', 'ticket-sil'] };
module.exports.help = { name: 'ticket-sıfırla' };
