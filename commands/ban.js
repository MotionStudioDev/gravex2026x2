const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const moment = require('moment');
moment.locale('tr');

// Emoji ID'leri
const EMOJI = {
    X: '<:x_:1416529392955555871>',
    UYARI: '<a:uyar1:1416526541030035530>',
    TIK: '<:tik1:1416526332803809401>'
};

const TIME_LIMIT = 30000; // 30 saniye onay süresi (Modal süresi 5 dakika)

module.exports.run = async (client, message, args) => {
    // 1. YETKİ KONTROLÜ
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`${EMOJI.X} | Yetki Yok`)
            .setDescription(`${EMOJI.UYARI} | Bu komutu kullanmak için \`Üyeleri Yasakla\` yetkisine sahip olmalısın.`);
        return message.channel.send({ embeds: [embed] });
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const author = message.member;

    // 2. HEDEF KONTROLÜ
    if (!target) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`${EMOJI.X} | Kullanıcı Bulunamadı`)
            .setDescription(`${EMOJI.UYARI} | Lütfen geçerli bir kullanıcı etiketle veya ID gir.`);
        return message.channel.send({ embeds: [embed] });
    }

    // 3. HİYERARŞİ VE KONTROLLER
    if (target.id === author.id) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription('Kendini banlayamazsın.')] });
    }
    if (target.roles.highest.position >= author.roles.highest.position) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription('Bu kullanıcı seninle aynı veya senden daha yüksek bir role sahip.')] });
    }
    if (!target.bannable) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`${EMOJI.UYARI} | Ban Başarısız`)
            .setDescription(`${EMOJI.UYARI} | Bu kullanıcıyı banlayamıyorum. Yetkim yetersiz olabilir.`);
        return message.channel.send({ embeds: [embed] });
    }


    // --- MESAJ SİLME SEÇENEĞİ (SELECT MENU) ---
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('delete_days')
        .setPlaceholder('Silinecek mesaj gün sayısını seçin (Varsayılan: 0 Gün)')
        .addOptions([
            { label: 'Mesaj Silme (0 Gün)', value: '0', description: 'Kullanıcının hiç mesajı silinmez.', default: true },
            { label: 'Son 1 Gün', value: '1', description: 'Son 24 saatteki mesajlar silinir.' },
            { label: 'Son 7 Gün (Maksimum)', value: '7', description: 'Son 7 gündeki mesajlar silinir.' },
        ]);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    // 4. MODAL BAŞLATMA BUTONU
    const startModalId = `ban_start_${Date.now()}`;
    const cancelId = `ban_cancel_${Date.now()}`;

    const startModalButton = new ButtonBuilder()
        .setCustomId(startModalId)
        .setLabel('Sebep Gir ve Banla')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel('İptal Et')
        .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(startModalButton, cancelButton);
    
    // --- ÖN BİLGİ EMBEDİ ---
    const preBanEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('🛠️ Yasaklama Ayarları')
        .setDescription(`**${target.user.tag}** kullanıcısını yasaklamak için lütfen aşağıdaki ayarları seçin ve **Sebep Gir ve Banla** butonuna basın.`)
        .addFields(
            { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: false },
            { name: 'Yasaklayan Yetkili', value: author.user.tag, inline: false }
        )
        .setFooter({ text: `Banlama işlemi, Modal açıldıktan sonra devam edecektir.` });

    const response = await message.channel.send({
        embeds: [preBanEmbed],
        components: [selectRow, buttonRow]
    });

    // 5. KOLEKTÖR (Sadece başlatma ve iptal butonu/select menu için)
    const filter = (i) => (i.customId === startModalId || i.customId === cancelId || i.customId === 'delete_days') && i.user.id === message.author.id;
    
    let deleteMessageDays = 0; // Başlangıçta 0 gün

    const collector = response.createMessageComponentCollector({ filter, time: TIME_LIMIT, componentType: ComponentType.MessageComponent });
    
    // MODAL ID'leri dinamik olarak oluşturulmalı
    const modalCustomId = `ban_modal_${target.id}_${Date.now()}`;


    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'Bu interaktif öğeyi sadece komutu başlatan yetkili kullanabilir.', ephemeral: true });
        }

        if (i.customId === 'delete_days') {
            // Select Menu Etkileşimi: Gün sayısını güncelle
            deleteMessageDays = parseInt(i.values[0]);
            
            // Embedin sadece footer kısmını güncelleyerek seçimin yapıldığını belirt
            const updatedEmbed = new EmbedBuilder(preBanEmbed)
                .setFooter({ text: `Mesaj Silme Günü: ${deleteMessageDays} gün seçildi.` });
                
            await i.update({ embeds: [updatedEmbed] });
            return;
        }

        if (i.customId === cancelId) {
            // İptal İşlemi
            collector.stop('cancelled');
            const cancelEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('❌ İşlem İptal Edildi')
                .setDescription(`\`${target.user.tag}\` kullanıcısını banlama işlemi yetkili tarafından iptal edildi.`);
            
            await i.update({ embeds: [cancelEmbed], components: [] });
            return;
        }
        
        if (i.customId === startModalId) {
            // --- MODAL OLUŞTURMA ---
            
            // Sebep Metin Kutusu (ZORUNLU)
            const reasonInput = new TextInputBuilder()
                .setCustomId('ban_reason')
                .setLabel("Yasaklama Sebebi (Zorunlu)")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(5)
                .setPlaceholder('Örn: Küfürlü konuşma, reklam vb.');

            // Kanıt Metin Kutusu (OPSİYONEL)
            const proofInput = new TextInputBuilder()
                .setCustomId('ban_proof')
                .setLabel("Kanıt Linki (Opsiyonel)")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('Örn: https://kanitim.com/resim.png');

            const modal = new ModalBuilder()
                .setCustomId(modalCustomId) // Dinamik ID
                .setTitle(`Yasaklama: ${target.user.tag}`)
                .addComponents(
                    new ActionRowBuilder().addComponents(reasonInput),
                    new ActionRowBuilder().addComponents(proofInput)
                );

            // Modalı aç
            await i.showModal(modal);
            
            // Modal açıldıktan sonra collector'ı durdurmuyoruz, Modal Submit'i bekleyeceğiz.
            // Sadece bu butonu devre dışı bırakıp iptal butonunu bırakabiliriz.
            const disabledStartRow = new ActionRowBuilder().addComponents(
                startModalButton.setDisabled(true),
                cancelButton
            );
            await response.edit({ components: [selectRow, disabledStartRow] }).catch(() => {});
            
            
            // 6. MODAL SUBMIT İŞLEMCİSİ
            
            const modalFilter = (modalInteraction) => modalInteraction.customId === modalCustomId && modalInteraction.user.id === message.author.id;
            
            // 5 dakikalık modal süresi
            i.awaitModalSubmit({ filter: modalFilter, time: 5 * 60000 }) 
                .then(async modalInteraction => {
                    
                    collector.stop('modal_submitted'); // Ana kolektörü durdur

                    const reason = modalInteraction.fields.getTextInputValue('ban_reason');
                    const proof = modalInteraction.fields.getTextInputValue('ban_proof') || 'Yok';

                    // --- DM BİLDİRİMİ GÖNDERME GİRİŞİMİ ---
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

                    // --- Ban İşlemi ---
                    await target.ban({ 
                        reason: `${reason} | Kanıt: ${proof} | Yetkili: ${message.author.tag}`,
                        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
                    }).catch(err => {
                        console.error(err);
                        return modalInteraction.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle(`${EMOJI.X} HATA`).setDescription(`Ban işlemi başarısız oldu: \`${err.message}\``)], ephemeral: true });
                    });
                    
                    // --- Başarı Mesajı ---
                    const tarih = moment().format('DD.MM.YYYY');
                    const saat = moment().format('HH:mm:ss');

                    const banSuccessEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle(`${EMOJI.TIK} | Ban Başarılı`)
                        .addFields(
                            { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: false },
                            { name: 'Yetkili', value: `${message.author.tag} (${message.author.id})`, inline: false },
                            { name: 'Sebep', value: reason, inline: true },
                            { name: 'Silinen Mesaj', value: `${deleteMessageDays} gün`, inline: true },
                            { name: 'Kanıt Linki', value: proof, inline: false }
                        )
                        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: `Grave BAN Sistemi | ${tarih} / ${saat}` });

                    // Mesajı güncelle
                    await modalInteraction.update({ embeds: [banSuccessEmbed], components: [] });

                })
                .catch(async (err) => {
                    // Modal süresi doldu veya hata oluştu
                    if (err.code === 'InteractionCollectorError') { 
                        // Süre dolduysa, ana mesajı güncelleyelim.
                        collector.stop('modal_timeout');
                    } else {
                         // Diğer hatalar
                         console.error("Modal Submit Hata:", err);
                         
                    }
                });
        }
    });

    collector.on('end', async (collected, reason) => {
        // Süre dolduğunda veya modal süresi dolduğunda butonu devre dışı bırak
        if (reason === 'time' || reason === 'modal_timeout') {
            const timeOutEmbed = new EmbedBuilder(preBanEmbed) 
                .setColor('Grey')
                .setTitle('⏳ İşlem Süresi Doldu')
                .setDescription('İşlem süresi dolduğu için banlama süreci otomatik olarak iptal edildi.');

            const disabledRow = new ActionRowBuilder().addComponents(
                startModalButton.setDisabled(true).setLabel('Süre Doldu'),
                cancelButton.setDisabled(true)
            );
            const disabledSelectRow = new ActionRowBuilder().addComponents(
                selectMenu.setDisabled(true)
            );

            await response.edit({ embeds: [timeOutEmbed], components: [disabledSelectRow, disabledRow] }).catch(() => {});
        }
        // Eğer 'cancelled' veya 'modal_submitted' ise zaten güncellenmiştir.
    });
};

module.exports.conf = {
    aliases: ['yasakla'],
    permLevel: 0
};

module.exports.help = {
    name: 'ban',
    description: 'Üyeleri Modal ile sebep girerek sunucudan yasaklar.',
    usage: 'g!ban @Kullanıcı'
};
