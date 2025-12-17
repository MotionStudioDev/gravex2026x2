const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const TicketSettings = require('../models/TicketSettings');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.');
    }

    const existingSettings = await TicketSettings.findOne({ guildId: message.guildId });

    if (existingSettings) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('Orange')
                .setTitle('⚠️ Bilet Sistemi Zaten Kurulu!')
                .setDescription(
                    'Bu sunucuda bilet sistemi zaten aktif.\n\n' +
                    'Yeni bir panel kurmak istiyorsanız önce mevcut sistemi sıfırlamalısınız.\n\n' +
                    '**Sıfırlamak için:** `g!ticket-sıfırla`'
                )
                .addFields(
                    { name: 'Mevcut Kategori', value: `<#${existingSettings.categoryId}>`, inline: true },
                    { name: 'Yetkili Rol', value: `<@&${existingSettings.staffRoleId}>`, inline: true },
                    { name: 'Panel Kanalı', value: `<#${existingSettings.channelId}>`, inline: false }
                )
            ]
        });
    }

    const categoryId = args[0];
    const staffRoleId = args[1];

    if (!categoryId || !staffRoleId) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('Red')
                .setDescription('❌ Kullanım: `!ticket-sistemi <kategoriID> <yetkiliRolID>`\n\nÖrnek: `!ticket-sistemi 123456789012345678 987654321098765432`')
            ]
        });
    }

    if (isNaN(categoryId) || isNaN(staffRoleId)) {
        return message.reply('❌ Lütfen geçerli ID numaraları girin.');
    }

    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Bilet paneli oluşturuluyor...');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    const resultEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('🎫 Destek Sistemi')
        .setDescription('Destek talebi oluşturmak için aşağıdaki butona tıklayınız.\n\n**Kurallar:**\n- Gereksiz talep açmak yasaktır.\n- Yetkilileri gereksiz yere etiketlemeyin.\n- Sabırlı olun, en kısa sürede ilgilenilecektir.')
        .setFooter({ text: 'Grave Ticket Sistemi' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_ticket_modal')
            .setLabel('Bilet Aç')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary)
    );

    await msg.edit({ embeds: [resultEmbed], components: [row] });

    await TicketSettings.create({
        guildId: message.guildId,
        categoryId,
        staffRoleId,
        messageId: msg.id,
        channelId: message.channel.id
    });

    await message.reply({
        embeds: [new EmbedBuilder()
            .setColor('Green')
            .setDescription('✅ **Bilet sistemi başarıyla kuruldu!**\nArtık kullanıcılar bilet açabilir.')
        ]
    });
};

module.exports.conf = { aliases: ['ticket-kur', 'ticket-setup'] };
module.exports.help = { name: 'ticket-sistemi' };
