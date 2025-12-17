const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const TicketSettings = require('../models/TicketSettings');

module.exports.run = async (client, message, args) => {
    // Yetki kontrolü
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.');
    }

    const settings = await TicketSettings.findOne({ guildId: message.guildId });

    if (!settings) {
        return message.reply('⚠️ Bu sunucuda aktif bir bilet sistemi bulunamadı.');
    }

    // Mevcut panel mesajını kontrol et (opsiyonel bilgi için)
    let panelStatus = 'bulunamadı (silinmiş olabilir)';
    try {
        const channel = await message.guild.channels.fetch(settings.channelId);
        const panelMessage = await channel.messages.fetch(settings.messageId);
        panelStatus = `<#${settings.channelId}> kanalında mevcut`;
    } catch (e) {
        // Mesaj veya kanal silinmiş
    }

    const confirmEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🗑️ Bilet Sistemi Sıfırlama Onayı')
        .setDescription(
            '**Dikkat!** Bu işlem geri alınamaz.\n\n' +
            'Bilet sistemi tamamen sıfırlanacak ve aşağıdaki veriler silinecek:\n' +
            `- Kategori: <#${settings.categoryId}>\n` +
            `- Yetkili Rol: <@&${settings.staffRoleId}>\n` +
            `- Panel Konumu: ${panelStatus}\n\n` +
            '**Onaylıyor musunuz?**'
        )
        .setFooter({ text: 'Onay için 30 saniyeniz var.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('confirm_ticket_reset')
            .setLabel('Evet, Sıfırla')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️'),
        new ButtonBuilder()
            .setCustomId('cancel_ticket_reset')
            .setLabel('İptal Et')
            .setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.reply({ embeds: [confirmEmbed], components: [row] });

    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_ticket_reset') {
            await TicketSettings.deleteOne({ guildId: message.guildId });

            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ Bilet Sistemi Başarıyla Sıfırlandı!')
                    .setDescription('Tüm ayarlar silindi. Artık `!ticket-sistemi` komutuyla yeniden kurulum yapabilirsiniz.')
                ],
                components: []
            });
        } else if (i.customId === 'cancel_ticket_reset') {
            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('Grey')
                    .setDescription('❌ Sıfırlama işlemi iptal edildi.')
                ],
                components: []
            });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            msg.edit({
                embeds: [new EmbedBuilder()
                    .setColor('Orange')
                    .setDescription('⏰ Süre doldu, sıfırlama işlemi iptal edildi.')
                ],
                components: []
            }).catch(() => {});
        }
    });
};

module.exports.conf = { aliases: ['ticket-reset', 'ticket-sıfırla'] };
module.exports.help = { name: 'ticket-sıfırla' };
