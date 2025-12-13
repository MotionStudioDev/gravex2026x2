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
    
    // Mesaj Silme Seçeneği (Select Menu) - Seçime göre default değeri atanarak kalıcılık sağlanır.
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('delete_days')
        .setPlaceholder('Silinecek mesaj gün sayısını seçin (Varsayılan: 0 Gün)')
        .addOptions([
            { label: 'Mesaj Silme (0 Gün)', value: '0', description: 'Kullanıcının hiç mesajı silinmez.', default: currentDeleteDays === 0 },
            { label: 'Son 1 Gün', value: '1', description: 'Son 24 saatteki mesajlar silinir.', default: currentDeleteDays === 1 },
            { label: 'Son 7 Gün (Maksimum)', value: '7', description: 'Son 7 gündeki mesajlar silinir.', default: currentDeleteDays === 7 },
        ]);
    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    // Butonlar
    const quickBanButton = new ButtonBuilder()
        .setCustomId(quickBanId)
        .setLabel('Banla')
        .setStyle(ButtonStyle.Primary);

    const modalBanButton = new ButtonBuilder()
        .setCustomId(modalBanId)
        .setLabel('Sebep İle Banla')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel('İptal Et')
        .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(quickBanButton, modalBanButton, cancelButton);

    return [selectRow, buttonRow];
}
// ------------------------------------

module.exports.run = async (client, message, args) => {
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

    const quickBanId = `ban_quick_${Date.now()}`;
    const modalBanId = `ban_modal_start_${Date.now()}`;
    const cancelId = `ban_cancel_${Date.now()}`;

    let deleteMessageDays = 0; // Başlangıçta 0 gün
    const modalCustomId = `ban_modal_entry_${target.id}_${Date.now()}`;

    // Başlangıç Bileşenlerini Yükle
    const initialComponents = getComponents(deleteMessageDays, quickBanId, modalBanId, cancelId);

    const preBanEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('🛠️ Yasaklama Onayı ve Ayarları')
        .setDescription(`**${target.user.tag}** kullanıcısını banlamak için bir yöntem seçin ve mesaj silme gününü ayarlayın.`)
        .addFields(
            { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: false },
            { name: 'Yasaklayan Yetkili', value: author.user.tag, inline: false }
        )
        .setFooter({ text: `Mesaj Silme Günü: ${deleteMessageDays} gün | İşlem süresi ${TIME_LIMIT / 1000} saniyedir.` });

    const response = await message.channel.send({
        embeds: [preBanEmbed],
        components: initialComponents
    });
    
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

        // Ban İşlemi: Hata kontrolü için try...catch kullanıldı.
        try {
            await target.ban({ 
                reason: `${reason} | Kanıt: ${proof} | Yetkili: ${message.author.tag}`,
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
            });
        } catch (err) {
            console.error("Ban Hata:", err);
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle(`${EMOJI.X} HATA: Ban Başarısız`)
                .setDescription(`Ban işlemi gerçekleştirilemedi. Botun yetkisi yetersiz olabilir veya başka bir hata oluştu. Hata mesajı: \`${err.message}\``);
            
            // Hata durumunda mesajı i.update veya i.editReply ile güncelle
            // i.update() başarılı olursa ilk defer/reply işlemi iptal olur.
            // Başarılı olmazsa (ModalSubmit'ten geliyorsa) deferlenmiş mesajı editReply ile düzenleriz.
            try {
                await i.update({ embeds: [errorEmbed], components: [] });
            } catch (e) {
                 await i.editReply({ embeds: [errorEmbed], components: [] }).catch(e2 => console.error("Final Error Handling Failed:", e2));
            }
            return; // KRİTİK: Hata durumunda fonksiyonu sonlandır.
        }
        
        // --- Buradan sonrası SADECE ban başarılıysa çalışır. ---
        
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

        // KRİTİK DÜZELTME: Başarılı güncelleme için i.update() yerine i.editReply() kullanıldı.
        // Bu, modalInteraction.deferUpdate() veya i.deferUpdate() sonrası hatasız çalışmasını sağlar.
        await i.editReply({ embeds: [banSuccessEmbed], components: [successRow] });
        
        // Yeni kolektör başlat (Post-Ban Aksiyonları için)
        startPostBanCollector(response, target.id, message.author.id, unbanId, copyId, closeId);
    }
    
    // --- POST BAN KOLEKTÖRÜ (Ban sonrası aksiyonlar için) ---
    function startPostBanCollector(response, targetId, authorId, unbanId, copyId, closeId) {
        const postFilter = (i) => (i.customId === unbanId || i.customId === copyId || i.customId === closeId) && i.user.id === authorId;
        const postCollector = response.createMessageComponentCollector({ filter: postFilter, time: 300000 }); // 5 dakika

        postCollector.on('collect', async i => {
            if (i.customId === unbanId) {
                await i.deferReply({ ephemeral: true }); 
                
                await message.guild.bans.remove(targetId, `Banı Kaldır Butonu ile kaldırıldı. Yetkili: ${message.author.tag}`).then(async () => {
                    postCollector.stop('unbanned');
                    const unbanEmbed = new EmbedBuilder(response.embeds[0])
                        .setTitle(`${EMOJI.TIK} | Ban Başarıyla Kaldırıldı`)
                        .setColor('Green')
                        .setDescription(`\`${targetId}\` ID'li kullanıcının banı \`${i.user.tag}\` tarafından kaldırıldı.`);
                    
                    await response.edit({ embeds: [unbanEmbed], components: [] });
                    await i.followUp({ content: `${EMOJI.TIK} Kullanıcının banı başarıyla kaldırıldı.`, ephemeral: true });
                }).catch(err => {
                    return i.followUp({ content: `${EMOJI.X} Ban kaldırılamadı. Hata: \`${err.message}\``, ephemeral: true });
                });

            } 
            else if (i.customId === copyId) {
                await i.reply({ content: `**Banlanan Kullanıcı ID'si:** \`${targetId}\`\n\n(Bu ID'yi kopyalayıp kullanabilirsiniz.)`, ephemeral: true });
            } 
            else if (i.customId === closeId) {
                await i.deferUpdate(); 
                postCollector.stop('closed');
                await response.edit({ components: [] });
            }
        });
        
        postCollector.on('end', async (collected, reason) => {
             if (reason !== 'unbanned' && reason !== 'closed') {
                 await response.edit({ components: [] }).catch(() => {});
             }
        });
    }

    // --- ANA KOLEKTÖR İŞLEMLERİ ---
    const filter = (i) => (i.customId === quickBanId || i.customId === modalBanId || i.customId === cancelId || i.customId === 'delete_days') && i.user.id === message.author.id;
    const collector = response.createMessageComponentCollector({ filter, time: TIME_LIMIT, componentType: ComponentType.MessageComponent });

    collector.on('collect', async i => {
        if (i.customId === 'delete_days') {
            // DÜZELTME: Seçimi al ve bileşenleri yeniden oluştur
            deleteMessageDays = parseInt(i.values[0]);
            
            const updatedEmbed = new EmbedBuilder(preBanEmbed).setFooter({ text: `Mesaj Silme Günü: ${deleteMessageDays} gün seçildi. | İşlem süresi ${TIME_LIMIT / 1000} saniyedir.` });
            const newComponents = getComponents(deleteMessageDays, quickBanId, modalBanId, cancelId);
            
            // Select Menu güncellendiğinde, seçimi kalıcı hale getirmek için update kullanılır.
            await i.update({ embeds: [updatedEmbed], components: newComponents });
            return;
        }

        if (i.customId === cancelId) {
            collector.stop('cancelled');
            const cancelEmbed = new EmbedBuilder().setColor('Yellow').setTitle('❌ İşlem İptal Edildi').setDescription(`\`${target.user.tag}\` kullanıcısını banlama işlemi iptal edildi.`);
            await i.update({ embeds: [cancelEmbed], components: [] });
            return;
        }
        
        if (i.customId === quickBanId) {
            collector.stop('quick_ban');
            await i.deferUpdate(); // Ban işleminden önceki mesajı düzenlemeye hazırla
            await executeBan(i, DEFAULT_REASON);
            return;
        }

        if (i.customId === modalBanId) {
            collector.stop('modal_opened'); 
            
            const reasonInput = new TextInputBuilder().setCustomId('ban_reason').setLabel("Yasaklama Sebebi").setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(5).setPlaceholder('Zorunlu: Küfürlü konuşma, reklam vb.');
            const proofInput = new TextInputBuilder().setCustomId('ban_proof').setLabel("Kanıt Linki (Opsiyonel)").setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Örn: https://kanitim.com/resim.png');

            const modal = new ModalBuilder()
                .setCustomId(modalCustomId)
                .setTitle(`Yasaklama: ${target.user.tag}`)
                .addComponents(new ActionRowBuilder().addComponents(reasonInput), new ActionRowBuilder().addComponents(proofInput));

            await i.showModal(modal);
            
            
            // 6. MODAL SUBMIT İŞLEMCİSİ
            const modalFilter = (modalInteraction) => modalInteraction.customId === modalCustomId && modalInteraction.user.id === message.author.id;
            
            i.awaitModalSubmit({ filter: modalFilter, time: 5 * 60000 }) 
                .then(async modalInteraction => {
                    const reason = modalInteraction.fields.getTextInputValue('ban_reason');
                    const proof = modalInteraction.fields.getTextInputValue('ban_proof') || 'Yok';
                    
                    await modalInteraction.deferUpdate(); // Ban işleminden önceki mesajı düzenlemeye hazırla
                    await executeBan(modalInteraction, reason, proof);

                })
                .catch(async (err) => {
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
