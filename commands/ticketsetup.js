const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({
            content: '❌ Bu komutu çalıştırmak için **Yönetici** yetkisine sahip olmalısınız.',
            ephemeral: true
        });
    }

    const setupEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('🎫 Destek Bileti Sistemi')
        .setDescription('Bir destek bileti açmak ve yöneticilerle özel olarak görüşmek için aşağıdaki butona tıklayın.')
        .setFooter({ text: 'Lütfen sadece ciddi konular için bilet açın.' });

    const setupRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('🎟️ Bilet Aç')
            .setStyle(ButtonStyle.Success)
    );

    await message.delete().catch(() => {});
    await message.channel.send({
        embeds: [setupEmbed],
        components: [setupRow]
    });
};

module.exports.conf = { aliases: ['ticketkurulum', 'ticketsend'] };
module.exports.help = { name: 'ticketsetup' };
