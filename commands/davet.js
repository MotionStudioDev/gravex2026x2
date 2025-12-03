const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ⚠️ BU ALANLARI KENDİ BİLGİLERİNİZLE DOLDURUN!
// Botunuzun davet linkini (Gerekli izinlerle oluşturulmuş)
const BOT_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1066016782827130960&permissions=8&integration_type=0&scope=bot'; 
// Botun destek sunucusunun kalıcı davet linki
const SUPPORT_SERVER_URL = 'https://discord.gg/CVZ4zEkJws'; 
// Destek sunucunuz yoksa, yukarıdaki satırı boş bırakabilir veya silebilirsiniz.

module.exports.run = async (client, message, args) => {
    // 1. Embed Oluşturma
    const inviteEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🔗 GraveBOT | Bizi Sunucuna Ekle!')
        .setDescription(
            `Merhaba ${message.author.username}! GraveBOT'u kendi sunucuna ekleyerek tüm özelliklerimizden yararlanabilirsin.\n\n` +
            `Aşağıdaki butonları kullanarak botu davet et veya destek sunucumuza katılarak bize ulaş!`
        )
        .addFields(
            { name: '🌐 Sunucu Sayısı', value: `Şu anda **${client.guilds.cache.size}** sunucuda hizmet veriyoruz.`, inline: false }
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Desteğiniz için teşekkürler!' });

    // 2. Butonları Oluşturma
    const inviteButton = new ButtonBuilder()
        .setLabel('Botu Davet Et')
        .setStyle(ButtonStyle.Link)
        .setURL(BOT_INVITE_URL);

    const supportButton = new ButtonBuilder()
        .setLabel('Destek Sunucusu')
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_SERVER_URL);
        
    // 3. Butonları Satıra Ekleme
    const row = new ActionRowBuilder().addComponents(inviteButton, supportButton);

    // 4. Mesajı Gönderme
    message.channel.send({ embeds: [inviteEmbed], components: [row] });
};

module.exports.conf = {
    aliases: ['invite', 'davet-et', 'destek']
};

module.exports.help = {
    name: 'davet'
};
