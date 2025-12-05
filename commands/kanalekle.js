const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelType, 
    InteractionType 
} = require('discord.js');

// Modal ID'leri ve İşlem Tipleri
const MODAL_ID = 'kanalekle_modal';
const METIN_TIPI = 'metin';
const SES_TIPI = 'ses';

module.exports.run = async (client, message, args) => {
    try {
        // Yetki kontrolü (Yönetici veya Kanalları Yönet)
        if (
            !message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
        ) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Yetki Hatası')
                        .setDescription('Bu komutu sadece **Yönetici** veya **Kanalları Yönet** yetkisine sahip olanlar kullanabilir.')
                ],
                ephemeral: true
            });
        }

        // --- Başlangıç Mesajı ve Butonlar ---
        const startEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('➕ Kanal Ekleme Sihirbazı')
            .setDescription('Oluşturmak istediğiniz kanalın tipini seçin. İşlem 30 saniye içinde sonlanacaktır.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(METIN_TIPI).setLabel('💬 Metin Kanalı').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(SES_TIPI).setLabel('🔊 Ses Kanalı').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('iptal').setLabel('❌ İptal Et').setStyle(ButtonStyle.Danger)
        );

        const msg = await message.channel.send({ embeds: [startEmbed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000
        });

        collector.on('collect', async i => {
            // Hata çözümü: i.deferUpdate() kaldırıldı. Modal göstermek tek başına geçerli bir yanıttır.
            
            if (i.customId === 'iptal') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ İşlem İptal Edildi')
                    .setDescription('Kanal ekleme işlemi iptal edildi.');
                
                // İptal butonuna tıklandığında mesajı güncelle
                await i.update({ embeds: [cancelEmbed], components: [] }); 
                return collector.stop();
            }

            // --- Modal'ı Oluşturma ---
            const tip = i.customId === METIN_TIPI ? 'Metin' : 'Ses';
            const modal = new ModalBuilder()
                .setCustomId(`${MODAL_ID}_${i.customId}`) // Modal ID'sine tipi ekliyoruz (kanalekle_modal_metin)
                .setTitle(`${tip} Kanalı Oluştur`);

            const kanalAdiInput = new TextInputBuilder()
                .setCustomId('kanalAdiInput')
                .setLabel(`${tip} Kanal Adı (zorunlu)`)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(100)
                .setPlaceholder('örneğin: genel-sohbet veya sohbet-odası');

            const kategoriInput = new TextInputBuilder()
                .setCustomId('kategoriIdInput')
                .setLabel('Kategori ID (opsiyonel)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('Kanalın ekleneceği kategorinin ID’si');

            modal.addComponents(
                new ActionRowBuilder().addComponents(kanalAdiInput),
                new ActionRowBuilder().addComponents(kategoriInput)
            );

            // Modal'ı göster. Bu, butona tek ve doğru yanıttır.
            await i.showModal(modal); 
            collector.stop(); // Modal açıldıktan sonra buton kolektörünü durdur

            // --- Modal Yanıtını Yakalama ---
            const modalInteraction = await i.awaitModalSubmit({
                time: 60000,
                filter: modalI => modalI.user.id === message.author.id
            }).catch(() => null);

            if (!modalInteraction) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('⏳ Zaman Aşımı')
                    .setDescription('Modal yanıt süresi doldu, işlem iptal edildi.');
                return msg.edit({ embeds: [timeoutEmbed], components: [] });
            }

            await modalInteraction.deferUpdate(); // Yanıtı hızlıca kabul et

            const finalKanalAdi = modalInteraction.fields.getTextInputValue('kanalAdiInput').trim();
            const finalKategoriId = modalInteraction.fields.getTextInputValue('kategoriIdInput').trim();
            const finalTip = modalInteraction.customId.endsWith(METIN_TIPI) ? ChannelType.GuildText : ChannelType.GuildVoice;
            const tipAdi = finalTip === ChannelType.GuildText ? 'Metin' : 'Ses';

            // Kategori kontrolü
            let parentKategori = null;
            if (finalKategoriId) {
                const kategori = message.guild.channels.cache.get(finalKategoriId);
                if (kategori && kategori.type === ChannelType.GuildCategory) {
                    parentKategori = kategori.id;
                } else {
                    const kategoriHataEmbed = new EmbedBuilder()
                        .setColor('#FEE75C')
                        .setTitle('⚠️ Kategori Hatası')
                        .setDescription('Girilen Kategori ID geçersiz veya bir kategori kanalı değil. Kanal kök dizine eklenecek.');
                    await msg.edit({ embeds: [kategoriHataEmbed], components: [] });
                }
            }
            
            // --- Kanalı Oluşturma ---
            try {
                const yeniKanal = await message.guild.channels.create({
                    name: finalKanalAdi,
                    type: finalTip,
                    parent: parentKategori, // Kategori ID'si
                    reason: `${message.author.tag} tarafından ${tipAdi} kanalı eklendi.`
                });

                const doneEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('✅ Kanal Başarıyla Eklendi')
                    .setDescription(`Oluşturulan Kanal: ${yeniKanal}\nTip: **${tipAdi}**\nKategori: **${yeniKanal.parent ? yeniKanal.parent.name : 'Yok'}**`)
                    .setFooter({ text: `İşlem ${message.author.tag} tarafından tamamlandı.` });

                await msg.edit({ embeds: [doneEmbed], components: [] });

            } catch (err) {
                console.error('Kanal Oluşturma Hatası:', err);
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Kanal Oluşturma Hatası')
                    .setDescription('Kanal oluşturulurken bir hata oluştu. Botun gerekli yetkilere (Kanalları Yönet) sahip olduğundan emin olun.');
                
                await msg.edit({ embeds: [errorEmbed], components: [] });
            }
        });

        collector.on('end', async (collected, reason) => {
             // Kullanıcı kendisi iptal etmediyse veya modal açılmadıysa butonları devre dışı bırak
             if (reason !== 'user' && reason !== 'modalSubmit') { 
                try {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                    );
                    await msg.edit({ components: [disabledRow] }).catch(() => {});
                } catch {}
             }
        });

    } catch (err) {
        console.error('kanalekle komutu genel hatası:', err);
        message.channel.send('⚠️ | Kanal ekleme sırasında beklenmedik bir hata oluştu.');
    }
};

module.exports.conf = { aliases: ['channeladd', 'kanalekle'] };
module.exports.help = { name: 'kanalekle' };
