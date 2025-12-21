const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const Giveaway = require('../models/giveaway');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has('ManageMessages')) {
        return message.reply({ content: '❌ Bu komutu kullanmak için **Mesajları Yönet** yetkin olmalı!' });
    }

    // 1. Yükleniyor Embed'i
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ **Çekiliş sihirbazı başlatılıyor...**');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // 2. Onay Butonları
    const confirmEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🚨 Çekiliş Sihirbazı')
        .setDescription('Çekiliş kurulum sihirbazını başlatmak üzeresiniz.\n**Devam etmek istiyor musunuz?**');

    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_yes').setLabel('Evet, Başlat').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('confirm_no').setLabel('İptal Et').setStyle(ButtonStyle.Danger).setEmoji('✖️')
    );

    await msg.edit({ embeds: [confirmEmbed], components: [confirmRow] });

    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 120000 });

    let secilenKanal = null;

    collector.on('collect', async (i) => {
        try {
            // İptal
            if (i.customId === 'confirm_no') {
                await i.update({ content: '❌ Çekiliş kurulumu iptal edildi.', embeds: [], components: [] });
                collector.stop();
                return;
            }

            // Başlat
            if (i.customId === 'confirm_yes') {
                const channelEmbed = new EmbedBuilder()
                    .setColor('Blue')
                    .setTitle('📢 Kanal Seçimi')
                    .setDescription('Lütfen çekilişin yapılacağı **metin kanalını** aşağıdan seçin.');

                const channelMenu = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('select_channel')
                        .setPlaceholder('Bir kanal seç...')
                        .setChannelTypes(ChannelType.GuildText)
                );

                await i.update({ embeds: [channelEmbed], components: [channelMenu] });
            }

            // Kanal seçildi
            if (i.customId === 'select_channel') {
                secilenKanal = i.channels.first();

                const readyEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ Kanal Seçildi!')
                    .setDescription(`**Seçilen Kanal:** ${secilenKanal}\n\nDevam etmek için aşağıdaki butona tıklayın.`);

                const nextBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('open_modal_btn')
                        .setLabel('Çekiliş Bilgilerini Gir')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎉')
                );

                await i.update({ embeds: [readyEmbed], components: [nextBtn] });
            }

            // Modal açma butonu
            if (i.customId === 'open_modal_btn') {
                const modal = new ModalBuilder()
                    .setCustomId('giveaway_modal')
                    .setTitle('🎁 Çekiliş Ayarları');

                const prizeInput = new TextInputBuilder()
                    .setCustomId('prize')
                    .setLabel('Ödül Nedir?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Örn: 1 Ay Nitro Classic')
                    .setRequired(true)
                    .setMaxLength(100);

                const timeInput = new TextInputBuilder()
                    .setCustomId('time')
                    .setLabel('Süre (Örn: 1h 30m veya 2d)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Örn: 10m, 2h, 1d 6h')
                    .setRequired(true);

                const winnerInput = new TextInputBuilder()
                    .setCustomId('winnerCount')
                    .setLabel('Kaç Kazanan Olsun?')
                    .setStyle(TextInputStyle.Short)
                    .setValue('1')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(2);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(prizeInput),
                    new ActionRowBuilder().addComponents(timeInput),
                    new ActionRowBuilder().addComponents(winnerInput)
                );

                await i.showModal(modal);
            }

        } catch (err) {
            console.error('Collector hatası:', err);
        }
    });

    // Modal Submit Ayrı Dinleyici
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit() || interaction.customId !== 'giveaway_modal') return;
        if (interaction.user.id !== message.author.id) return;

        try {
            await interaction.deferReply({ ephemeral: true });

            const odul = interaction.fields.getTextInputValue('prize');
            const sureStr = interaction.fields.getTextInputValue('time');
            const kazananSayisi = parseInt(interaction.fields.getTextInputValue('winnerCount'));

            if (isNaN(kazananSayisi) || kazananSayisi < 1 || kazananSayisi > 50) {
                return interaction.editReply({ content: '❌ Kazanan sayısı 1-50 arasında olmalı!' });
            }

            const sureMs = parseTime(sureStr);
            if (!sureMs || sureMs < 60000) { // Min 1 dakika
                return interaction.editReply({ content: '❌ Geçersiz veya çok kısa süre! (Min: 1 dakika)' });
            }

            const bitisZamani = Date.now() + sureMs;

            const giveawayEmbed = new EmbedBuilder()
                .setColor('#FF0066')
                .setTitle(`🎉 YENİ ÇEKİLİŞ: ${odul}`)
                .setDescription(`Aşağıdaki butona basarak katıl!\n\n🕒 **Bitiş:** <t:${Math.floor(bitisZamani / 1000)}:R>\n👑 **Başlatan:** ${message.author}\n🏆 **Kazanan Sayısı:** ${kazananSayisi}`)
                .setFooter({ text: 'Bol Şans! 🍀' })
                .setTimestamp();

            const joinBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('join_giveaway')
                    .setLabel('Katıl 🎉')
                    .setStyle(ButtonStyle.Success)
            );

            const giveawayMsg = await secilenKanal.send({ embeds: [giveawayEmbed], components: [joinBtn] });

            // Veritabanına kaydet
            await new Giveaway({
                guildId: message.guild.id,
                channelId: secilenKanal.id,
                messageId: giveawayMsg.id,
                hostId: message.author.id,
                prize: odul,
                winnerCount: kazananSayisi,
                endTime: bitisZamani,
                participants: [],
                ended: false
            }).save();

            // Kurulum mesajını bitir
            await interaction.editReply({ content: `✅ Çekiliş başarıyla ${secilenKanal} kanalında başlatıldı!` });
            await msg.edit({ content: '✅ Çekiliş kurulumu tamamlandı ve başlatıldı.', embeds: [], components: [] });

            collector.stop();

            // Zamanlayıcı ile bitir
            setTimeout(async () => {
                try {
                    const handler = require('../events/ready'); // ready.js dosyanın yolu
                    if (handler.endGiveawayExternal) {
                        await handler.endGiveawayExternal(client, giveawayMsg.id);
                    }
                } catch (err) {
                    console.error('Çekiliş bitirilemedi (handler bulunamadı):', err);
                }
            }, sureMs);

        } catch (err) {
            console.error('Modal submit hatası:', err);
            if (!interaction.replied) {
                await interaction.editReply({ content: '❌ Bir hata oluştu, lütfen tekrar deneyin.' }).catch(() => {});
            }
        }
    });
};

// Geliştirilmiş süre parser (1d 2h 30m gibi destekler)
function parseTime(str) {
    const regex = /(\d+)(s|m|h|d)/gi;
    let totalMs = 0;
    let match;

    while ((match = regex.exec(str.toLowerCase())) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];

        if (unit === 's') totalMs += value * 1000;
        else if (unit === 'm') totalMs += value * 60 * 1000;
        else if (unit === 'h') totalMs += value * 60 * 60 * 1000;
        else if (unit === 'd') totalMs += value * 24 * 60 * 60 * 1000;
    }

    return totalMs > 0 ? totalMs : null;
}

module.exports.conf = {
    aliases: ['gstart', 'çekiliş', 'cekilis']
};

module.exports.help = {
    name: 'çekiliş-sistemi',
    description: 'Gelişmiş çekiliş sihirbazı ile çekiliş başlatır.'
};
