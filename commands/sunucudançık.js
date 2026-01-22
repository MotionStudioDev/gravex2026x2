const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message, args) => {
    // 1. SAHİP KONTROLÜ (Config dosyadaki ID ile değiştirin)
    const SAHIP_ID = "702901632136118273"; 
    if (message.author.id !== SAHIP_ID) return;

    const sunucuId = args[0];
    if (!sunucuId) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('Red')
                .setDescription('❌ **Hata:** Lütfen çıkış yapılacak sunucunun ID\'sini giriniz.\n`g!sunucudançık <Sunucu-ID>`')]
        });
    }

    const guild = client.guilds.cache.get(sunucuId);
    if (!guild) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('Red')
                .setDescription('❌ **Hata:** Bot belirtilen ID\'ye sahip bir sunucuda bulunmuyor.')]
        });
    }

    // --- ÖN ONAY EMBED ---
    const onayEmbed = new EmbedBuilder()
        .setAuthor({ name: 'GraveOS | Kritik İşlem', iconURL: client.user.displayAvatarURL() })
        .setTitle('⚠️ Sunucudan Ayrılma Onayı')
        .setColor('#FEE75C')
        .setDescription(
            `Aşağıdaki sunucudan çıkış yapmak üzeresiniz. Bu işlem geri alınamaz!\n\n` +
            `🏰 **Sunucu Adı:** \`${guild.name}\`\n` +
            `🆔 **Sunucu ID:** \`${guild.id}\`\n` +
            `👥 **Üye Sayısı:** \`${guild.memberCount}\`\n` +
            `👑 **Sahibi:** <@${guild.ownerId}>`
        )
        .setFooter({ text: 'Onaylamak için aşağıdaki butona tıklayın.' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cik_onay').setLabel('SUNUCUDAN AYRIL').setStyle(ButtonStyle.Danger).setEmoji('🚪'),
        new ButtonBuilder().setCustomId('cik_iptal').setLabel('İŞLEMİ İPTAL ET').setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({ embeds: [onayEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 30000 
    });

    collector.on('collect', async (i) => {
        if (i.customId === 'cik_iptal') {
            const iptalEmbed = new EmbedBuilder().setColor('Grey').setDescription('✅ İşlem güvenli bir şekilde iptal edildi.');
            return i.update({ embeds: [iptalEmbed], components: [] });
        }

        if (i.customId === 'cik_onay') {
            try {
                // Sunucudan ayrılmadan önce başarılı embed gönder
                const basariliEmbed = new EmbedBuilder()
                    .setColor('#00FF7F')
                    .setTitle('🚀 İşlem Tamamlandı')
                    .setDescription(`**${guild.name}** sunucusundan başarıyla ayrılındı.`)
                    .addFields({ name: 'ID', value: `\`${guild.id}\`` });

                await i.update({ embeds: [basariliEmbed], components: [] });

                // SUNUCUDAN ÇIKIŞ YAP
                await guild.leave();
            } catch (err) {
                const hataEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('❌ Bir Hata Oluştu')
                    .setDescription(`Sunucudan ayrılırken bir sorun yaşandı: \`${err.message}\``);
                await i.followUp({ embeds: [hataEmbed], ephemeral: true });
            }
        }
    });

    collector.on('end', (c, reason) => {
        if (reason === 'time' && c.size === 0) {
            msg.edit({ content: '⌛ Zaman aşımı: İşlem iptal edildi.', embeds: [], components: [] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['guild-leave', 'sunucu-ayrıl']
};

module.exports.help = {
    name: 'sunucudançık',
    description: 'IDsi girilen sunucudan botu çıkarır.'
};
