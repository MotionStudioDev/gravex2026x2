const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const moment = require('moment');
moment.locale('tr');

const EMOJI = {
    X: '❌', // Yerel emojileri kullanmak daha evrensel
    UYARI: '⚠️',
    TIK: '✅'
};

const TIME_LIMIT = 30000; // 30 saniye
const DEFAULT_REASON = "Yönetici Kararı (Hızlı Ban)";

module.exports.run = async (client, message, args) => {
    // ... (Yetki, Hedef, Hiyerarşi Kontrolleri, aynı kalacak) ...
    // --- KONTROLLER BAŞLANGIÇ ---
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const embed = new EmbedBuilder().setColor('Red').setTitle(`${EMOJI.X} | Yetki Yok`).setDescription(`${EMOJI.UYARI} | Bu komutu kullanmak için \`Üyeleri Yasakla\` yetkisine sahip olmalısın.`);
        return message.channel.send({ embeds: [embed] });
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const author = message.member;

    if (!target) {
        const embed = new EmbedBuilder().setColor('Red').setTitle(`${EMOJI.X} | Kullanıcı Bulunamadı`).setDescription(`${EMOJI.UYARI} | Lütfen geçerli bir kullanıcı etiketle veya ID gir.`);
        return message.channel.send({ embeds: [embed] });
    }

    if (target.id === author.id) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription('Kendini banlayamazsın.')] });
    }
    if (target.roles.highest.position >= author.roles.highest.position) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription('Bu kullanıcı seninle aynı veya senden daha yüksek bir role sahip.')] });
    }
    if (!target.bannable) {
        const embed = new EmbedBuilder().setColor('Red').setTitle(`${EMOJI.UYARI} | Ban Başarısız`).setDescription(`${EMOJI.UYARI} | Bu kullanıcıyı banlayamıyorum. Yetkim yetersiz olabilir.`);
        return message.channel.send({ embeds: [embed] });
    }
    // --- KONTROLLER BİTİŞ ---

    // --- MESAJ SİLME SEÇENEĞİ ---
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('delete_days')
        .setPlaceholder('Silinecek mesaj gün sayısını seçin (Varsayılan: 0 Gün)')
        .addOptions([
            { label: 'Mesaj Silme (0 Gün)', value: '0', description: 'Kullanıcının hiç mesajı silinmez.', default: true },
            { label: 'Son 1 Gün', value: '1', description: 'Son 24 saatteki mesajlar silinir.' },
            { label: 'Son 7 Gün (Maksimum)', value: '7', description: 'Son 7 gündeki mesajlar silinir.' },
        ]);
    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    // --- MODAL/HIZLI BAN BUTONLARI ---
    const quickBanId = `ban_quick_${Date.now()}`;
    const modalBanId = `ban_modal_start_${Date.now()}`;
    const cancelId = `ban_cancel_${Date.now()}`;

    const quickBanButton = new ButtonBuilder()
        .setCustomId(quickBanId)
        .setLabel('Banla (Varsayılan Sebep)')
        .setStyle(ButtonStyle.Primary);

    const modalBanButton = new ButtonBuilder()
        .setCustomId(modalBanId)
        .setLabel('Sebeple Banla (Modal)')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel('İptal Et')
        .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(quickBanButton, modalBanButton, cancelButton);
    
    const preBanEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('🛠️ Yasaklama Onayı ve Ayarları')
        .setDescription(`**${target.user.tag}** kullanıcısını banlamak için bir yöntem seçin ve mesaj silme gününü ayarlayın.`)
        .addFields(
            { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: false },
            { name: 'Yasaklayan Yetkili', value: author.user.tag, inline: false }
        )
        .setFooter({ text: `İşlem süresi ${TIME_LIMIT / 1000} saniyedir.` });

    const response = await message.channel.send({
        embeds: [preBanEmbed],
        components: [selectRow, buttonRow]
    });

    let deleteMessageDays = 0;
    const modalCustomId = `ban_modal_entry_${target.id}_${Date.now()}`;
    
    const filter = (i) => (i.customId === quickBanId || i.customId === modalBanId || i.customId === cancelId || i.customId === 'delete_days') && i.user.id === message.author.id;
    const collector = response.createMessageComponentCollector({ filter, time: TIME_LIMIT, componentType: ComponentType.MessageComponent });


    // --- ANA BAN İŞLEVİ (Tekrar Kullanılabilir Fonksiyon) ---
    async function executeBan(i, reason, proof = 'Yok') {
        // DM Bildirimi
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
        
        await target.send({ embeds: [dmEmbed] }).catch(() => {});

        // Ban İşlemi
        await target.ban({ 
            reason: `${reason} | Kanıt: ${proof} | Yetkili: ${message.author.tag}`,
            deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
        }).catch(err => {
            console.error(err);
            return i.update({ 
                embeds: [new EmbedBuilder().setColor('Red').setTitle(`${EMOJI.X} HATA`).setDescription(`Ban işlemi başarısız oldu: \`${err.message}\``)], components: [] 
            });
        });
        
        // --- BAŞARI MESAJI BUTONLARI ---
        const unbanId = `postban_unban_${target.id}_${Date.now()}`;
        const copyId = `postban_copy_${target.id}_${Date.now()}`;
        const closeId = `postban_close_${Date.now()}`;

        const successRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(unbanId).setLabel('Banı Kaldır').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(copyId).setLabel('ID Kopyala').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(closeId).setLabel('Kapat').setStyle(ButtonStyle.Secondary),
        );

        const tarih = moment().format('DD.MM.YYYY');
        const saat = moment().format('HH:mm:ss');

        const banSuccessEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle(`${EMOJI.TIK} | Ban Başarılı`)
            .addFields(
                { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: false },
                { name: 'Yetkili', value: `${message.author.tag}`, inline: false },
                { name: 'Sebep', value: reason, inline: true },
                { name: 'Silinen Mesaj', value: `${deleteMessageDays} gün`, inline: true },
                { name: 'Kanıt Linki', value: proof, inline: false }
            )
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Grave BAN Sistemi | ${tarih} / ${saat}` });

        await i.update({ embeds: [banSuccessEmbed], components: [successRow] });
        
        // Yeni kolektör başlat (Post-Ban Aksiyonları için)
        startPostBanCollector(response, target.id, message.author.id, unbanId, copyId, closeId);
    }
    
    // --- POST BAN KOLEKTÖRÜ ---
    function startPostBanCollector(response, targetId, authorId, unbanId, copyId, closeId) {
        const postFilter = (i) => (i.customId === unbanId || i.customId === copyId || i.customId === closeId) && i.user.id === authorId;
        const postCollector = response.createMessageComponentCollector({ filter: postFilter, time: 300000 }); // 5 dakika

        postCollector.on('collect', async i => {
            await i.deferUpdate().catch(() => {}); // Defer Update her zaman gerekli

            if (i.customId === unbanId) {
                // Banı Kaldır İşlemi
                await message.guild.bans.remove(targetId, `Banı Kaldır Butonu ile kaldırıldı. Yetkili: ${message.author.tag}`).catch(err => {
                    return i.followUp({ content: `${EMOJI.X} Ban kaldırılamadı. Hata: \`${err.message}\``, ephemeral: true });
                });

                postCollector.stop('unbanned');
                const unbanEmbed = new EmbedBuilder(response.embeds[0])
                    .setTitle(`${EMOJI.TIK} | Ban Başarıyla Kaldırıldı`)
                    .setColor('Green')
                    .setDescription(`\`${targetId}\` ID'li kullanıcının banı \`${i.user.tag}\` tarafından kaldırıldı.`);
                
                await response.edit({ embeds: [unbanEmbed], components: [] });
            } 
            else if (i.customId === copyId) {
                // ID Kopyalama Simülasyonu
                await i.followUp({ content: `**Banlanan Kullanıcı ID'si:** \`${targetId}\`\n\n(Bu ID'yi kopyalayıp kullanabilirsiniz.)`, ephemeral: true });
            } 
            else if (i.customId === closeId) {
                // Kapat İşlemi
                postCollector.stop('closed');
                await response.edit({ components: [] });
            }
        });
        
        postCollector.on('end', async (collected, reason) => {
             if (reason !== 'unbanned' && reason !== 'closed') {
                 // Süre dolduğunda butonları kaldır
                 await response.edit({ components: [] }).catch(() => {});
             }
        });
    }

    // --- ANA KOLEKTÖR İŞLEMLERİ ---
    collector.on('collect', async i => {
        if (i.customId === 'delete_days') {
            deleteMessageDays = parseInt(i.values[0]);
            const updatedEmbed = new EmbedBuilder(preBanEmbed).setFooter({ text: `Mesaj Silme Günü: ${deleteMessageDays} gün seçildi. | İşlem süresi ${TIME_LIMIT / 1000} saniyedir.` });
            await i.update({ embeds: [updatedEmbed] });
            return;
        }

        if (i.customId === cancelId) {
            collector.stop('cancelled');
            const cancelEmbed = new EmbedBuilder().setColor('Yellow').setTitle('❌ İşlem İptal Edildi').setDescription(`\`${target.user.tag}\` kullanıcısını banlama işlemi iptal edildi.`);
            await i.update({ embeds: [cancelEmbed], components: [] });
            return;
        }
        
        if (i.customId === quickBanId) {
            // Hızlı Ban İşlemi
            collector.stop('quick_ban');
            await i.deferUpdate(); // İşlemi uzatmak için defer
            await executeBan(i, DEFAULT_REASON);
            return;
        }

        if (i.customId === modalBanId) {
            // --- MODAL AÇMA ---
            const reasonInput = new TextInputBuilder().setCustomId('ban_reason').setLabel("Yasaklama Sebebi").setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(5).setPlaceholder('Zorunlu: Küfürlü konuşma, reklam vb.');
            const proofInput = new TextInputBuilder().setCustomId('ban_proof').setLabel("Kanıt Linki (Opsiyonel)").setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Örn: https://kanitim.com/resim.png');

            const modal = new ModalBuilder()
                .setCustomId(modalCustomId)
                .setTitle(`Yasaklama: ${target.user.tag}`)
                .addComponents(new ActionRowBuilder().addComponents(reasonInput), new ActionRowBuilder().addComponents(proofInput));

            await i.showModal(modal);
            
            // Modal açıldıktan sonra ana kolektörün süre dolmasını bekletmek için durdururuz
            collector.stop('modal_opened'); 
            
            // 6. MODAL SUBMIT İŞLEMCİSİ
            const modalFilter = (modalInteraction) => modalInteraction.customId === modalCustomId && modalInteraction.user.id === message.author.id;
            
            i.awaitModalSubmit({ filter: modalFilter, time: 5 * 60000 }) 
                .then(async modalInteraction => {
                    const reason = modalInteraction.fields.getTextInputValue('ban_reason');
                    const proof = modalInteraction.fields.getTextInputValue('ban_proof') || 'Yok';
                    
                    await modalInteraction.deferUpdate(); // İşlem devam ediyor
                    await executeBan(modalInteraction, reason, proof);

                })
                .catch(async (err) => {
                    // Modal süresi dolduysa, ana mesajı güncelleyelim.
                    if (err.code === 'InteractionCollectorError') { 
                        const timeOutEmbed = new EmbedBuilder(preBanEmbed).setColor('Grey').setTitle('⏳ Modal Süresi Doldu').setDescription('Sebep giriş süresi dolduğu için banlama işlemi iptal edildi.');
                        await response.edit({ embeds: [timeOutEmbed], components: [] }).catch(() => {});
                    } else {
                         console.error("Modal Submit Hata:", err);
                    }
                });
        }
    });

    collector.on('end', async (collected, reason) => {
        // 'quick_ban', 'modal_opened' veya 'cancelled' değilse ve süre dolduysa
        if (reason === 'time') {
            const timeOutEmbed = new EmbedBuilder(preBanEmbed) 
                .setColor('Grey')
                .setTitle('⏳ İşlem Süresi Doldu')
                .setDescription('Seçim süresi dolduğu için banlama işlemi otomatik olarak iptal edildi.');

            await response.edit({ embeds: [timeOutEmbed], components: [] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['yasakla'],
    permLevel: 0
};

module.exports.help = {
    name: 'ban',
    description: 'Üyeleri Modal veya Hızlı Ban seçenekleriyle yasaklar. Sonuç mesajında aksiyon butonları bulunur.',
    usage: 'g!ban @Kullanıcı'
};
