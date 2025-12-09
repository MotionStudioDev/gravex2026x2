const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const moment = require('moment');
moment.locale('tr');

// Emoji ID'leri
const EMOJI = {
    X: '<:x_:1416529392955555871>',
    UYARI: '<a:uyar1:1416526541030035530>',
    TIK: '<:tik1:1416526332803809401>'
};

module.exports.run = async (client, message, args) => {
    // 1. YETKİ KONTROLÜ (Yetkili)
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`${EMOJI.X} | Yetki Yok`)
            .setDescription(`${EMOJI.UYARI} | Bu komutu kullanmak için \`Üyeleri Yasakla\` yetkisine sahip olmalısın.`);
        return message.channel.send({ embeds: [embed] });
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    const author = message.member;

    // 2. HEDEF KONTROLÜ
    if (!target) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`${EMOJI.X} | Kullanıcı Bulunamadı`)
            .setDescription(`${EMOJI.UYARI} | Lütfen geçerli bir kullanıcı etiketle veya ID gir.`);
        return message.channel.send({ embeds: [embed] });
    }

    // 3. HİYERARŞİ VE KENDİ KENDİNİ BANLAMA KONTROLÜ
    if (target.id === author.id) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription('Kendini banlayamazsın.')] });
    }
    // Botun kendi rol kontrolü
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

    // 4. ONAY MEKANİZMASI BAŞLANGICI
    
    const confirmId = `ban_confirm_${Date.now()}`;
    const cancelId = `ban_cancel_${Date.now()}`;

    const confirmButton = new ButtonBuilder()
        .setCustomId(confirmId)
        .setLabel('Onayla (Ban)')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel('İptal Et')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    const preBanEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('⚠️ Ban Onayı Gerekiyor')
        .setDescription(`**${target.user.tag}** kullanıcısını banlamak istediğinden emin misin?`)
        .addFields(
            { name: 'Sebep', value: reason, inline: false },
            { name: 'Onaylayan Yetkili', value: author.user.tag, inline: false }
        )
        .setFooter({ text: 'Bu işlem 10 saniye içinde onaylanmalıdır.' });

    const response = await message.channel.send({
        embeds: [preBanEmbed],
        components: [row]
    });

    // 5. ONAY KOLEKTÖRÜ
    const filter = (i) => i.customId === confirmId || i.customId === cancelId;
    
    // 10 saniye bekle
    const collector = response.createMessageComponentCollector({ filter, time: 10000, max: 1, componentType: ComponentType.Button });

    collector.on('collect', async i => {
        // Sadece komutu başlatan kişinin onaylamasını sağla
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'Bu butonu sadece komutu başlatan yetkili kullanabilir.', ephemeral: true });
        }

        if (i.customId === confirmId) {
            // Ban İşlemi
            await target.ban({ reason }).catch(err => {
                console.error(err);
                return i.update({ embeds: [new EmbedBuilder().setColor('Red').setTitle(`${EMOJI.X} HATA`).setDescription(`Ban işlemi başarısız oldu: \`${err.message}\``)], components: [] });
            });
            
            const tarih = moment().format('DD.MM.YYYY');
            const saat = moment().format('HH:mm:ss');

            const banSuccessEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle(`${EMOJI.TIK} | Ban Başarılı`)
                .addFields(
                    { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: false },
                    { name: 'Yetkili', value: `${message.author.tag} (${message.author.id})`, inline: false },
                    { name: 'Sebep', value: reason, inline: false },
                    { name: 'Tarih / Saat', value: `${tarih} / ${saat}`, inline: true }
                )
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Grave BAN Sistemi' });

            await i.update({ embeds: [banSuccessEmbed], components: [] });

        } else if (i.customId === cancelId) {
            // İptal İşlemi
            const cancelEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('❌ İşlem İptal Edildi')
                .setDescription(`\`${target.user.tag}\` kullanıcısını banlama işlemi yetkili tarafından iptal edildi.`);
            
            await i.update({ embeds: [cancelEmbed], components: [] });
        }
    });

    collector.on('end', async (collected, reason) => {
        // Süre dolduğunda butonu devre dışı bırak ve mesajı güncelle
        if (reason === 'time' && collected.size === 0) {
            const timeOutEmbed = new EmbedBuilder(preBanEmbed) // Eski embedi al
                .setColor('Grey')
                .setTitle('⏳ İşlem Süresi Doldu')
                .setDescription('Onay süresi dolduğu için banlama işlemi otomatik olarak iptal edildi.');

            const disabledRow = new ActionRowBuilder().addComponents(
                confirmButton.setDisabled(true),
                cancelButton.setDisabled(true).setLabel('Süre Doldu')
            );

            await response.edit({ embeds: [timeOutEmbed], components: [disabledRow] }).catch(err => console.error("Timeout Edit Hata:", err));
        }
        // Eğer zaten butona basılmışsa, mesajı tekrar düzenlemeye gerek yok.
    });
};

module.exports.conf = {
    aliases: ['yasakla'],
    permLevel: 0
};

module.exports.help = {
    name: 'ban',
    description: 'Üyeleri onay ile sunucudan yasaklar.',
    usage: 'g!ban @Kullanıcı [Sebep]'
};
