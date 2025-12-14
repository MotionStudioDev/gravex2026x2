const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const moment = require('moment');
moment.locale('tr');

const EMOJI = {
    X: '❌', 
    UYARI: '⚠️',
    TIK: '✅'
};

const TIME_LIMIT = 30000; 
const DEFAULT_REASON = "Yönetici Kararı (Hızlı Ban)";

// --- Dinamik Bileşen Oluşturucu ---
function getComponents(currentDeleteDays, quickBanId, modalBanId, cancelId) {
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('delete_days')
        .setPlaceholder('Silinecek mesaj gün sayısını seçin (Varsayılan: 0 Gün)')
        .addOptions([
            { label: 'Mesaj Silme (0 Gün)', value: '0', description: 'Kullanıcının hiç mesajı silinmez.', default: currentDeleteDays === 0 },
            { label: 'Son 1 Gün', value: '1', description: 'Son 24 saatteki mesajlar silinir.', default: currentDeleteDays === 1 },
            { label: 'Son 7 Gün (Maksimum)', value: '7', description: 'Son 7 gündeki mesajlar silinir.', default: currentDeleteDays === 7 },
        ]);
    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    // 🔥 QUICK BAN BUTONU (ÖZEL EMOJİLİ)
    const quickBanButton = new ButtonBuilder()
        .setCustomId(quickBanId)
        .setEmoji({ id: '1449794687153209424', name: 'ban23' })
        .setStyle(ButtonStyle.Primary);

    const modalBanButton = new ButtonBuilder()
        .setCustomId(modalBanId)
        .setLabel('Sebep İle Banla')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel('İptal Et')
        .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(
        quickBanButton,
        modalBanButton,
        cancelButton
    );

    return [selectRow, buttonRow];
}
// ------------------------------------

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`${EMOJI.X} | Yetki Yok`)
            .setDescription(`${EMOJI.UYARI} | Bu komutu kullanmak için \`Üyeleri Yasakla\` yetkisine sahip olmalısın.`);
        return message.channel.send({ embeds: [embed] });
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const author = message.member;

    if (!target) {
        return message.channel.send({
            embeds: [new EmbedBuilder().setColor('Red').setDescription('Geçerli bir kullanıcı belirt.')]
        });
    }

    if (target.id === author.id) {
        return message.channel.send({
            embeds: [new EmbedBuilder().setColor('Red').setDescription('Kendini banlayamazsın.')]
        });
    }

    if (target.roles.highest.position >= author.roles.highest.position) {
        return message.channel.send({
            embeds: [new EmbedBuilder().setColor('Red').setDescription('Bu kullanıcı senden yüksek veya eşit role sahip.')]
        });
    }

    if (!target.bannable) {
        return message.channel.send({
            embeds: [new EmbedBuilder().setColor('Red').setDescription('Bu kullanıcıyı banlayamıyorum.')]
        });
    }

    const quickBanId = `ban_quick_${Date.now()}`;
    const modalBanId = `ban_modal_start_${Date.now()}`;
    const cancelId = `ban_cancel_${Date.now()}`;

    let deleteMessageDays = 0;

    const response = await message.channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor('Orange')
                .setTitle('🛠️ Yasaklama Onayı')
                .setDescription(`${target.user.tag} kullanıcısını banlamak için seçim yap.`)
                .setFooter({ text: `Mesaj Silme: ${deleteMessageDays} gün` })
        ],
        components: getComponents(deleteMessageDays, quickBanId, modalBanId, cancelId)
    });

    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === author.id,
        time: TIME_LIMIT
    });

    collector.on('collect', async i => {
        if (i.customId === quickBanId) {
            await i.deferUpdate();
            await target.ban({
                reason: DEFAULT_REASON,
                deleteMessageSeconds: deleteMessageDays * 86400
            });
            await response.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Green')
                        .setTitle(`${EMOJI.TIK} Ban Başarılı`)
                        .setDescription(`${target.user.tag} yasaklandı.`)
                ],
                components: []
            });
        }

        if (i.customId === cancelId) {
            collector.stop();
            await i.update({
                embeds: [new EmbedBuilder().setColor('Grey').setDescription('İşlem iptal edildi.')],
                components: []
            });
        }
    });
};

module.exports.conf = {
    aliases: ['yasakla'],
    permLevel: 0
};

module.exports.help = {
    name: 'ban',
    description: 'Butonlu ban sistemi',
    usage: 'g!ban @Kullanıcı'
};
