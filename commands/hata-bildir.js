const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');

// --- AYARLAR ---
const LOG_CHANNEL_ID = "1441377140653293692";
const SAHIP_ID = "702901632136118273"; 
const cooldowns = new Map();

module.exports.run = async (client, message, args) => {
    const userId = message.author.id;

    // 1. Gelişmiş Cooldown
    if (cooldowns.has(userId)) {
        const timeLeft = (cooldowns.get(userId) + 60000 - Date.now()) / 1000;
        if (timeLeft > 0) return message.reply({ content: ` <a:uyar1:1416526541030035530> **Hız limitine takıldınız!** Lütfen **${timeLeft.toFixed(1)}s** sonra tekrar deneyin.` });
    }

    const icerik = args.join(" ");
    const ek = message.attachments.first() ? message.attachments.first().proxyURL : null;

    if (!icerik && !ek) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(' <a:uyar1:1416526541030035530> **Hata:** Boş bir bildirim gönderemezsiniz. Lütfen bir açıklama veya görsel ekleyin.')] });
    }

    // 2. Ultra Onay Ekranı (Senin Emojilerinle)
    const confirmEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Bildirim Gönderim Paneli', iconURL: client.user.displayAvatarURL() })
        .setDescription(`>>> **İletilecek Mesaj:**\n\`\`\`${icerik || "İçerik belirtilmedi (Sadece dosya)."}\`\`\``)
        .addFields({ 
            name: '📎 Dosya Eki', 
            value: ek ? '`Mevcut` <a:tickgre:1416899456246349854>' : '`Yok` <a:xxxx:1445123377181360138>', 
            inline: true 
        })
        .setFooter({ text: 'Onayladığınızda yetkililere anlık bildirim gider.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('Onayla ve Gönder').setEmoji('🚀').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel').setLabel('İşlemi İptal Et').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.reply({ embeds: [confirmEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 30000, max: 1 });

    collector.on('collect', async i => {
        if (i.customId === 'cancel') {
            return i.update({ embeds: [confirmEmbed.setColor('Red').setTitle(' <a:uyar1:1416526541030035530> İşlem İptal Edildi')], components: [] });
        }

        await i.update({ embeds: [new EmbedBuilder().setColor('Yellow').setDescription('<a:yukle:1440677432976867448> **Sistem:** Veriler şifreleniyor ve yetkili ağlara aktarılıyor...') ], components: [] });

        try {
            const reportEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: `Yeni Talep: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.guild.iconURL())
                .addFields(
                    { name: '👤 Gönderen', value: `<@${message.author.id}>\n(\`${message.author.id}\`)`, inline: true },
                    { name: '🌐 Sunucu', value: `**${message.guild.name}**`, inline: true },
                    { name: '📊 Durum', value: '`⏳ Beklemede (Cevaplanmadı)`', inline: false },
                    { name: '📝 Mesaj İçeriği', value: icerik ? `\`\`\`${icerik}\`\`\`` : "*Metin içeriği yok.*" }
                )
                .setFooter({ text: `Grave Engine • ID: ${message.id}` })
                .setTimestamp();

            if (ek) reportEmbed.setImage(ek);

            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            if (logChannel) {
                const logRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`reply_${message.author.id}`).setLabel('Kullanıcıyı Yanıtla').setEmoji('<:yolla:1455559170232160520>').setStyle(ButtonStyle.Secondary)
                );
                await logChannel.send({ content: `🔔 <@${SAHIP_ID}> Yeni bir bildirim geldi!`, embeds: [reportEmbed], components: [logRow] });
            }

            const userSuccessEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('<a:tickgre:1416899456246349854> Bildiriminiz Başarıyla İletildi!')
                .setDescription(`Merhaba **${message.author.username}**, talebiniz sistemimize kaydedildi.`)
                .addFields(
                    { name: '<:mesaj:1455558845844946978> Gönderilen Mesaj', value: `\`\`\`${icerik || "Dosya eki gönderildi."}\`\`\`` },
                    { name: '<:ID:1416530654006349967> Referans No', value: `\`${message.id}\`` }
                )
                .setFooter({ text: 'Yetkililer yanıt verdiğinde buradan bildirim alacaksınız.' })
                .setTimestamp();

            await message.author.send({ embeds: [userSuccessEmbed] }).catch(() => {});

            cooldowns.set(userId, Date.now());
            await msg.edit({ embeds: [new EmbedBuilder().setColor('Green').setTitle('<:tik1:1416526332803809401> İşlem Tamamlandı').setDescription('Bildiriminiz yetkililere iletildi ve size DM üzerinden bilgilendirme yapıldı.')] });

        } catch (err) {
            console.error(err);
            await msg.edit({ content: '<a:uyar1:1416526541030035530> **Kritik Hata:** Bildirim gönderilirken bir sorun oluştu.' });
        }
    });

    if (!client.listeners("interactionCreate").some(l => l.name === "ultraBildirimYanit")) {
        const ultraBildirimYanit = async (interaction) => {
            if (interaction.isButton() && interaction.customId.startsWith('reply_')) {
                const targetId = interaction.customId.split('_')[1];
                const modal = new ModalBuilder().setCustomId(`modal_${targetId}`).setTitle('Grave Destek - Yanıt Paneli');
                const input = new TextInputBuilder().setCustomId('reply_text').setLabel('Mesajınız').setPlaceholder('Yanıtınızı yazın...').setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal);
            }

            if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_')) {
                const targetId = interaction.customId.split('_')[1];
                const replyMsg = interaction.fields.getTextInputValue('reply_text');
                const user = await client.users.fetch(targetId).catch(() => null);
                if (!user) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

                const userReplyEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({ name: 'GraveBOT - Yetkili Yanıtı', iconURL: client.user.displayAvatarURL() })
                    .setDescription(`**Yetkililerimiz bildiriminizi inceledi:**\n\n>>> ${replyMsg}`)
                    .setFooter({ text: 'GraveBOT Destek Sistemi' })
                    .setTimestamp();

                await user.send({ embeds: [userReplyEmbed] }).then(() => {
                    interaction.reply({ content: `<a:tickgre:1416899456246349854> Yanıt **${user.tag}** adlı kullanıcıya iletildi.`, ephemeral: true });
                    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setFields(
                            interaction.message.embeds[0].fields[0],
                            interaction.message.embeds[0].fields[1],
                            { name: '📊 Durum', value: `\`✅ Yanıtlandı (${interaction.user.tag})\``, inline: false },
                            interaction.message.embeds[0].fields[3]
                        );
                    interaction.message.edit({ embeds: [updatedEmbed], components: [] });
                }).catch(() => {
                    interaction.reply({ content: '❌ Kullanıcının DM kutusu kapalı.', ephemeral: true });
                });
            }
        };
        client.on('interactionCreate', ultraBildirimYanit);
    }
};

module.exports.conf = { aliases: ['hata', 'bug', 'öneri', 'bildir'] };
module.exports.help = { name: 'hata-bildir' };
