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

    const quickBanButton = new ButtonBuilder()
        .setCustomId(quickBanId)
        .setLabel('Hızlı Ban')
        .setEmoji({ id: '1449794687153209424' }) 
        .setStyle(ButtonStyle.Primary);

    const modalBanButton = new ButtonBuilder()
        .setCustomId(modalBanId)
        .setLabel('Sebep İle Banla')
        .setEmoji('📝') 
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel('İptal Et')
        .setEmoji('✖️') 
        .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(quickBanButton, modalBanButton, cancelButton);

    return [selectRow, buttonRow];
}

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const embed = new EmbedBuilder().setColor('Red').setTitle(`${EMOJI.X} | Yetki Yok`).setDescription(`${EMOJI.UYARI} | Bu komutu kullanmak için \`Üyeleri Yasakla\` yetkisine sahip olmalısın.`);
        return message.channel.send({ embeds: [embed] });
    }

    // --- KRİTİK GELİŞTİRME: SUNUCU DIŞI KONTROLÜ ---
    let targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    let targetUser;

    if (targetMember) {
        targetUser = targetMember.user;
    } else if (args[0]) {
        try {
            targetUser = await client.users.fetch(args[0]);
        } catch (err) {
            return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Geçerli bir kullanıcı bulunamadı (ID hatalı olabilir).')] });
        }
    }

    if (!targetUser) {
        const embed = new EmbedBuilder().setColor('Red').setTitle(`${EMOJI.X} | Kullanıcı Bulunamadı`).setDescription(`${EMOJI.UYARI} | Lütfen geçerli bir kullanıcı etiketle veya ID gir.`);
        return message.channel.send({ embeds: [embed] });
    }

    if (targetUser.id === message.author.id) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription('Kendini banlayamazsın.')] });
    }

    // Hiyerarşi Kontrolü (Sadece sunucudaysa)
    if (targetMember) {
        if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
            return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription('Bu kullanıcı seninle aynı veya senden daha yüksek bir role sahip.')] });
        }
        if (!targetMember.bannable) {
            const embed = new EmbedBuilder().setColor('Red').setTitle(`${EMOJI.UYARI} | Ban Başarısız`).setDescription(`${EMOJI.UYARI} | Bu kullanıcıyı banlayamıyorum. Yetkim yetersiz olabilir.`);
            return message.channel.send({ embeds: [embed] });
        }
    }

    const quickBanId = `ban_quick_${Date.now()}`;
    const modalBanId = `ban_modal_start_${Date.now()}`;
    const cancelId = `ban_cancel_${Date.now()}`;

    let deleteMessageDays = 0; 
    const modalCustomId = `ban_modal_entry_${targetUser.id}_${Date.now()}`;

    const initialComponents = getComponents(deleteMessageDays, quickBanId, modalBanId, cancelId);

    const preBanEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('🛠️ Yasaklama Onayı ve Ayarları')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setDescription(`**${targetUser.tag}** kullanıcısını banlamak için bir yöntem seçin.`)
        .addFields(
            { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
            { name: 'Durum', value: targetMember ? '📥 Sunucuda' : '🌍 Sunucu Dışı (ID Ban)', inline: true },
            { name: 'Yasaklayan Yetkili', value: message.author.tag, inline: false }
        )
        .setFooter({ text: `Mesaj Silme Günü: ${deleteMessageDays} gün | İşlem süresi ${TIME_LIMIT / 1000} saniyedir.` });

    const response = await message.channel.send({
        embeds: [preBanEmbed],
        components: initialComponents
    });
    
    // --- ANA BAN İŞLEVİ ---
    async function executeBan(i, reason, proof = 'Yok') {
        const dmEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`Sunucudan Yasaklandın (${message.guild.name})`)
            .setDescription(`**${message.guild.name}** sunucusundan yasaklandın.`)
            .addFields(
                { name: 'Yasaklayan Yetkili', value: message.author.tag, inline: false },
                { name: 'Sebep', value: reason, inline: false },
                { name: 'Kanıt', value: proof, inline: false },
                { name: 'Silinen Mesaj', value: `${deleteMessageDays} gün`, inline: false }
            )
            .setTimestamp();
        
        if (targetMember) await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

        try {
            // targetMember.ban yerine guild.members.ban (ID banı için)
            await message.guild.members.ban(targetUser.id, { 
                reason: `${reason} | Kanıt: ${proof} | Yetkili: ${message.author.tag}`,
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
            });
        } catch (err) {
            console.error("Ban Hata:", err);
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle(`${EMOJI.X} HATA: Ban Başarısız`)
                .setDescription(`Ban işlemi gerçekleştirilemedi: \`${err.message}\``);
            
            try {
                await i.update({ embeds: [errorEmbed], components: [] });
            } catch (e) {
                 await i.editReply({ embeds: [errorEmbed], components: [] }).catch(() => {});
            }
            return;
        }
        
        const unbanId = `postban_unban_${targetUser.id}_${Date.now()}`;
        const copyId = `postban_copy_${targetUser.id}_${Date.now()}`;
        const closeId = `postban_close_${Date.now()}`;

        const successRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(unbanId).setLabel('Banı Kaldır').setEmoji('🔨').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(copyId).setLabel('ID Kopyala').setEmoji('📋').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(closeId).setLabel('Kapat').setEmoji('❌').setStyle(ButtonStyle.Secondary),
        );

        const banSuccessEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle(`${EMOJI.TIK} | Ban Başarılı`)
            .addFields(
                { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                { name: 'Yetkili', value: `${message.author.tag}`, inline: false },
                { name: 'Sebep', value: reason, inline: true },
                { name: 'Silinen Mesaj', value: `${deleteMessageDays} gün`, inline: true },
                { name: 'Kanıt Linki', value: proof, inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Grave BAN Sistemi | ${moment().format('DD.MM.YYYY / HH:mm:ss')}` });

        await i.editReply({ embeds: [banSuccessEmbed], components: [successRow] });
        startPostBanCollector(response, targetUser.id, message.author.id, unbanId, copyId, closeId);
    }
    
    // --- POST BAN KOLEKTÖRÜ ---
    function startPostBanCollector(response, targetId, authorId, unbanId, copyId, closeId) {
        const postFilter = (i) => (i.customId === unbanId || i.customId === copyId || i.customId === closeId) && i.user.id === authorId;
        const postCollector = response.createMessageComponentCollector({ filter: postFilter, time: 300000 });

        postCollector.on('collect', async i => {
            if (i.customId === unbanId) {
                await i.deferReply({ ephemeral: true }); 
                await message.guild.bans.remove(targetId, `Yetkili: ${message.author.tag}`).then(async () => {
                    postCollector.stop('unbanned');
                    const unbanEmbed = new EmbedBuilder(response.embeds[0]).setTitle(`${EMOJI.TIK} | Ban Başarıyla Kaldırıldı`).setColor('Green').setDescription(`\`${targetId}\` ID'li kullanıcının banı kaldırıldı.`);
                    await response.edit({ embeds: [unbanEmbed], components: [] });
                    await i.followUp({ content: `✅ Ban kaldırıldı.`, ephemeral: true });
                }).catch(err => i.followUp({ content: `❌ Hata: ${err.message}`, ephemeral: true }));
            } 
            else if (i.customId === copyId) {
                await i.reply({ content: `ID: \`${targetId}\``, ephemeral: true });
            } 
            else if (i.customId === closeId) {
                await i.deferUpdate(); 
                postCollector.stop('closed');
                await response.edit({ components: [] });
            }
        });
    }

    const filter = (i) => (i.customId === quickBanId || i.customId === modalBanId || i.customId === cancelId || i.customId === 'delete_days') && i.user.id === message.author.id;
    const collector = response.createMessageComponentCollector({ filter, time: TIME_LIMIT, componentType: ComponentType.MessageComponent });

    collector.on('collect', async i => {
        if (i.customId === 'delete_days') {
            deleteMessageDays = parseInt(i.values[0]);
            const updatedEmbed = new EmbedBuilder(preBanEmbed).setFooter({ text: `Mesaj Silme Günü: ${deleteMessageDays} gün seçildi.` });
            await i.update({ embeds: [updatedEmbed], components: getComponents(deleteMessageDays, quickBanId, modalBanId, cancelId) });
            return;
        }

        if (i.customId === cancelId) {
            collector.stop('cancelled');
            await i.update({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('❌ İşlem İptal Edildi')], components: [] });
            return;
        }
        
        if (i.customId === quickBanId) {
            collector.stop('quick_ban');
            await i.deferUpdate();
            await executeBan(i, DEFAULT_REASON);
            return;
        }

        if (i.customId === modalBanId) {
            collector.stop('modal_opened'); 
            const modal = new ModalBuilder()
                .setCustomId(modalCustomId)
                .setTitle(`Yasaklama: ${targetUser.username}`)
                .addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ban_reason').setLabel("Sebep").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ban_proof').setLabel("Kanıt Linki").setStyle(TextInputStyle.Short).setRequired(false))
                );
            await i.showModal(modal);
            
            i.awaitModalSubmit({ filter: m => m.customId === modalCustomId, time: 300000 })
                .then(async m => {
                    await m.deferUpdate();
                    await executeBan(m, m.fields.getTextInputValue('ban_reason'), m.fields.getTextInputValue('ban_proof') || 'Yok');
                }).catch(() => {});
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') await response.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ['yasakla'], permLevel: 0 };
module.exports.help = { name: 'ban' };
