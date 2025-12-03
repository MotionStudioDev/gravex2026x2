const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');

// moment Türkçe dil desteğini yükler
moment.locale('tr');

module.exports.run = async (client, message, args) => {
    
    // --- YETKİ KONTROLÜ (Yetkili) ---
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('🚫 Yetki Yok')
            .setDescription('Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısın.');
        return message.channel.send({ embeds: [embed] });
    }

    const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

    // --- HATA KONTROLÜ (Kullanıcı/Rol Bulma) ---
    if (!targetMember || !role) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Hatalı Kullanım')
            .setDescription('Kullanıcı veya rol belirtilmedi.\n\n**Doğru kullanım:** `g!rol-ver @kullanıcı @rol`');
        return message.channel.send({ embeds: [embed] });
    }
    
    // --- HATA KONTROLÜ (Rol Hiyerarşisi) ---
    // 1. Botun rolü, verilecek rolden daha yüksek olmalı
    if (role.position >= message.guild.members.me.roles.highest.position) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Yetki Hiyerarşisi')
            .setDescription(`Benim rolüm (${message.guild.members.me.roles.highest}), ${role} rolünden daha düşük veya onunla eşit. Rolü veremem.`);
        return message.channel.send({ embeds: [embed] });
    }

    // 2. Yetkilinin rolü, verilecek rolden daha yüksek olmalı (Opsiyonel ama güvenlik için iyi)
    if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Yetki Sınırı')
            .setDescription(`Senin rolün, ${role} rolünden daha düşük veya ona eşit olduğu için bu işlemi gerçekleştiremezsin.`);
        return message.channel.send({ embeds: [embed] });
    }
    
    // --- HATA KONTROLÜ (Zaten Sahip) ---
    if (targetMember.roles.cache.has(role.id)) {
        const embed = new EmbedBuilder()
            .setColor('Orange')
            .setTitle('ℹ️ Zaten Sahip')
            .setDescription(`${targetMember} kullanıcısı zaten ${role} rolüne sahip.`);
        return message.channel.send({ embeds: [embed] });
    }

    // --- ONAY AŞAMASI ---

    const onayEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('❓ Rol Verme Onayı')
        .setDescription(`${message.author} tarafından **${targetMember}** kullanıcısına **${role}** rolü verilmek üzere onay bekleniyor.`)
        .addFields(
            { name: 'Hedef Kullanıcı', value: `${targetMember.user.tag}`, inline: true },
            { name: 'Verilecek Rol', value: `${role.name}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Onaylamak için 30 saniyeniz var.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rolver_onay').setLabel('✅ Onayla').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('rolver_reddet').setLabel('❌ Reddet').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [onayEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.customId === 'rolver_onay' || i.customId === 'rolver_reddet',
        time: 30000 
    });

    collector.on('collect', async i => {
        // Sadece komutu kullanan yetkilinin butonlara basmasını sağla
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'Bu butonları sadece işlemi başlatan yetkili kullanabilir.', ephemeral: true });
        }

        collector.stop(); // Onay veya Red işlemi yapıldıysa dinlemeyi durdur

        if (i.customId === 'rolver_onay') {
            try {
                await targetMember.roles.add(role);

                const tarih = moment().format('DD.MM.YYYY');
                const saat = moment().format('HH:mm:ss');

                const successEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ Rol Başarıyla Verildi')
                    .addFields(
                        { name: 'Kullanıcı', value: `${targetMember.user.tag}`, inline: false },
                        { name: 'Verilen Rol', value: `${role.name}`, inline: false },
                        { name: 'Onaylayan Yetkili', value: `${message.author.tag}`, inline: false },
                        { name: 'Tarih', value: tarih, inline: true },
                        { name: 'Saat', value: saat, inline: true }
                    )
                    .setFooter({ text: 'Grave Rol yönetim sistemi' });

                await i.update({ embeds: [successEmbed], components: [] }); // Butonları kaldır
            } catch (err) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('❌ Rol Verilemedi')
                    .setDescription(`Discord API Hatası oluştu (Yetki hiyerarşisi veya bilinmeyen hata): \`${err.message}\``);
                
                // Hatayı yetkiliye gönder
                await i.update({ embeds: [errorEmbed], components: [] });
            }
        } else if (i.customId === 'rolver_reddet') {
            const rejectEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ İşlem Reddedildi')
                .setDescription(`${message.author} işlemi **reddetmeyi** seçti. Rol verme işlemi iptal edildi.`);
            
            await i.update({ embeds: [rejectEmbed], components: [] });
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('Grey')
                .setTitle('⏱️ İşlem Zaman Aşımı')
                .setDescription('Onay süresi dolduğu için rol verme işlemi otomatik olarak iptal edildi.');
            
            // Butonları devre dışı bırak ve zaman aşımını bildir
            const disabledRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(row.components[0]).setDisabled(true),
                ButtonBuilder.from(row.components[1]).setDisabled(true)
            );
            await msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['rolver']
};

module.exports.help = {
    name: 'rol-ver'
};
