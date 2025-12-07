const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const BotlistSettings = require('../models/BotlistSettings'); 

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız.');
    }

    const islem = args[0] ? args[0].toLowerCase() : null;
    const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

    let settings = await BotlistSettings.findOne({ guildId: message.guild.id });
    if (!settings) {
        settings = new BotlistSettings({ guildId: message.guild.id });
    }

    if (islem === 'log') {
        if (kanal) {
            settings.logChannelId = kanal.id;
            await settings.save();
            return message.reply(`✅ Bot başvuruları log kanalı başarıyla ${kanal} olarak ayarlandı!`);
        } else if (args[1] === 'sıfırla') {
            settings.logChannelId = null;
            await settings.save();
            return message.reply('✅ Bot başvuruları log kanalı başarıyla sıfırlandı!');
        } else {
            return message.reply('⚠️ Lütfen bir kanal etiketleyin veya ID girin: `g!botlist-ayarla log #kanal`');
        }
    } 
    
    // Yardım Embed'i
    const logChannel = settings.logChannelId ? `<#${settings.logChannelId}>` : 'Ayarlanmamış 🔴';

    const helpEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('⚙️ Bot Listesi Yönetim Ayarları')
        .setDescription(`**Başvuru Log Kanalı:** ${logChannel}\n\nBu kanala, kullanıcılar bot ekleme butonuyla başvurduğunda bildirimler düşecektir.`)
        .addFields(
            { name: 'Kullanım', value: '`!botlist-ayarla log <#kanal/sıfırla>`' }
        )
        .setFooter({ text: message.author.tag });
    
    return message.channel.send({ embeds: [helpEmbed] });
};

module.exports.conf = { aliases: ['blayarla'] };
module.exports.help = { name: 'botlist-ayarla' };
