const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message, args) => {
    const mainEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('💤 AFK Sistemi')
        .setDescription('Lütfen aşağıdaki seçeneklerden birini kullanarak AFK moduna geçiş yapın.')
        .setFooter({ text: 'AFK moduna girdiğinizde adınız güncellenecektir.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('afk_quick')
            .setLabel('Hızlı AFK Ol')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⚡'),
        new ButtonBuilder()
            .setCustomId('afk_modal_trigger')
            .setLabel('Sebep ile AFK Ol')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝')
    );

    await message.reply({ embeds: [mainEmbed], components: [row] });
};

module.exports.help = { name: 'afk' };
module.exports.conf = { aliases: [] };
