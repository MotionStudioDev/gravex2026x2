const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');

module.exports.run = async (client, message, args) => {
    // --- Yardımcı Fonksiyon: Hızlı Embed ---
    const sendEmbed = (title, desc, color = '#FF4D4D') => {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: 'GraveOS Moderasyon Sinyali', iconURL: client.user.displayAvatarURL() })
            .setDescription(`>>> ${desc}`)
            .setFooter({ text: 'Sistem Kayıtları Aktif' });
        return { embeds: [embed], components: [] };
    };

    // 1. Yetki ve Hedef Kontrolü
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply(sendEmbed('Yetki Hatası', '❌ Bu işlem için `Üyeleri Yönet` yetkiniz bulunmalıdır.'));
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply(sendEmbed('Kullanıcı Belirle', '⚠ Susturmasını kaldırmak istediğin kullanıcıyı belirtmelisin.', '#FBBF24'));

    // Kullanıcının susturma altında olup olmadığını kontrol et
    if (!target.communicationDisabledUntilTimestamp || target.communicationDisabledUntilTimestamp < Date.now()) {
        return message.reply(sendEmbed('Durum Bilgisi', `🔎 **${target.user.tag}** zaten susturulmuş bir kullanıcı değil.`, '#FBBF24'));
    }

    // 2. Onay Paneli
    const confirmEmbed = new EmbedBuilder()
        .setColor('#111827')
        .setAuthor({ name: 'GraveOS Moderasyon Paneli', iconURL: client.user.displayAvatarURL() })
        .setTitle(`🔓 Engel Kaldırma: ${target.user.tag}`)
        .setDescription('Kullanıcının susturma cezasını erken sonlandırmak üzeresiniz. Onaylıyor musunuz?')
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '👤 Kullanıcı', value: `${target}`, inline: true },
            { name: '🆔 ID', value: `\`${target.id}\``, inline: true }
        )
        .setFooter({ text: 'İşlem onayı bekleniyor...' });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('unmute_confirm').setLabel('Cezayı Kaldır').setStyle(ButtonStyle.Success).setEmoji('🔓'),
        new ButtonBuilder().setCustomId('unmute_cancel').setLabel('İptal Et').setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({ embeds: [confirmEmbed], components: [buttons] });

    // 3. Kolektör
    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 30000 
    });

    collector.on('collect', async i => {
        if (i.customId === 'unmute_confirm') {
            try {
                // Timeout'u kaldırmak için null gönderilir
                await target.timeout(null);
                
                await i.update(sendEmbed(
                    'İşlem Başarılı', 
                    `✅ **${target.user.tag}** kullanıcısının susturma cezası başarıyla kaldırıldı.`, 
                    '#3DD687'
                ));
            } catch (err) {
                await i.update(sendEmbed('Hata', `❌ İşlem sırasında bir sorun oluştu: ${err.message}`, '#FF4D4D'));
            }
        }

        if (i.customId === 'unmute_cancel') {
            await i.update(sendEmbed('İptal Edildi', '❌ İşlem moderatör tarafından iptal edildi.', '#94A3B8'));
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && msg) msg.delete().catch(() => null);
    });
};

module.exports.conf = {
    aliases: ['unmute', 'unto', 'susturma-kaldır']
};

module.exports.help = {
    name: 'untimeout'
};
