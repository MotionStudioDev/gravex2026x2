const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Bu komutu çalıştırmak için Yönetici yetkisine sahip olmalısınız.');
    }

    const setupEmbed = new EmbedBuilder()
        .setColor('#7289DA')
        .setTitle('🤖 Bot Listesi Başvuru Sistemi')
        .setDescription('Kendi Discord botunuzu listemize eklemek için aşağıdaki butona tıklayarak başvuru formunu doldurun.')
        .setFooter({ text: 'Lütfen doğru ve eksiksiz bilgiler giriniz.' });

    const setupRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_bot_submit_modal') 
            .setLabel('➕ Bot Ekle')
            .setStyle(ButtonStyle.Primary)
    );

    await message.delete().catch(() => {});
    await message.channel.send({ embeds: [setupEmbed], components: [setupRow] });
};

module.exports.conf = { aliases: ['botlistkurulum'] };
module.exports.help = { name: 'botlist-sistemi' };
