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

    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

    // --- HATA KONTROLÜ (Rol Bulma) ---
    if (!role) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Hatalı Kullanım')
            .setDescription('Rol belirtilmedi.\n\n**Doğru kullanım:** `g!herkese-rol-ver @rol`');
        return message.channel.send({ embeds: [embed] });
    }
    
    // --- HATA KONTROLÜ (Rol Hiyerarşisi) ---
    // Botun rolü, verilecek rolden daha yüksek olmalı
    if (role.position >= message.guild.members.me.roles.highest.position) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Yetki Hiyerarşisi')
            .setDescription(`Benim rolüm (${message.guild.members.me.roles.highest}), ${role} rolünden daha düşük veya onunla eşit. Bu rolü kimseye veremem.`);
        return message.channel.send({ embeds: [embed] });
    }
    
    // --- ONAY AŞAMASI (Toplu İşlem Uyarısı) ---

    const memberCount = message.guild.members.cache.size;

    const onayEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('⚠️ TOPLU ROL VERME ONAYI GEREKLİ')
        .setDescription(`
        **DİKKAT!** Bu işlem, sunucudaki **${memberCount}** üyeye \`${role.name}\` rolünü vermeye çalışacaktır.

        Bu işlemi onaylıyor musunuz?
        `)
        .addFields(
            { name: 'Verilecek Rol', value: `${role.name} (${role.id})`, inline: false },
            { name: 'Hedef Üye Sayısı', value: `${memberCount} üye`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Onaylamak için 30 saniyeniz var. İptal edilebilir bir işlemdir.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('herkese_rol_onay').setLabel('✅ EMINIM, ONAYLA').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('herkese_rol_reddet').setLabel('❌ İPTAL ET').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [onayEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.customId === 'herkese_rol_onay' || i.customId === 'herkese_rol_reddet',
        time: 30000 
    });

    collector.on('collect', async i => {
        // Sadece komutu kullanan yetkilinin butonlara basmasını sağla
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'Bu butonları sadece işlemi başlatan yetkili kullanabilir.', ephemeral: true });
        }

        collector.stop(); // Onay veya Red işlemi yapıldıysa dinlemeyi durdur

        if (i.customId === 'herkese_rol_onay') {
            await i.update({ 
                embeds: [new EmbedBuilder().setColor('Yellow').setTitle('🔄 İşlem Başlatıldı').setDescription('Toplu rol verme işlemi başlatılıyor, lütfen bekleyin...')], 
                components: [] 
            });

            let grantedCount = 0;
            let alreadyHasRoleCount = 0;

            // --- TOPLU ROL VERME İŞLEMİ ---
            // Tüm üyeleri önbellekten al ve döngüye sok
            for (const [memberID, member] of message.guild.members.cache) {
                // Rol zaten varsa atla
                if (member.roles.cache.has(role.id)) {
                    alreadyHasRoleCount++;
                    continue;
                }
                
                // Botun kendisi değilse ve rolü vermeye çalış
                if (member.user.id !== client.user.id) {
                    try {
                        await member.roles.add(role);
                        grantedCount++;
                    } catch (err) {
                        // Rol hiyerarşisi nedeniyle veya başka bir nedenle hata oluşursa devam et
                        console.error(`Üyeye rol verilemedi (${member.user.tag}): ${err.message}`);
                    }
                }
            }
            // --- İŞLEM SONUÇLANDI ---

            const tarih = moment().format('DD.MM.YYYY HH:mm:ss');
            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ TOPLU ROL VERME TAMAMLANDI')
                .addFields(
                    { name: 'İşlem Durumu', value: 'Başarıyla tamamlandı.', inline: false },
                    { name: 'Verilen Rol', value: `${role.name}`, inline: true },
                    { name: 'Rol Verilen Üye', value: `${grantedCount} kişi`, inline: true },
                    { name: 'Zaten Sahip Olan', value: `${alreadyHasRoleCount} kişi`, inline: true },
                    { name: 'Yetkili', value: `${message.author.tag}`, inline: false },
                    { name: 'Tarih', value: tarih, inline: false }
                )
                .setFooter({ text: 'Grave Toplu rol yönetim sistemi' });

            await msg.edit({ embeds: [successEmbed] });

        } else if (i.customId === 'herkese_rol_reddet') {
            const rejectEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ İşlem İptal Edildi')
                .setDescription(`${message.author} işlemi **iptal etmeyi** seçti. Toplu rol verme işlemi başlamadı.`);
            
            await i.update({ embeds: [rejectEmbed], components: [] });
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('Grey')
                .setTitle('⏱️ İşlem Zaman Aşımı')
                .setDescription('Onay süresi dolduğu için toplu rol verme işlemi otomatik olarak iptal edildi.');
            
            // Butonları devre dışı bırak
            const disabledRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(row.components[0]).setDisabled(true),
                ButtonBuilder.from(row.components[1]).setDisabled(true)
            );
            await msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['herkese-rolver', 'massrole']
};

module.exports.help = {
    name: 'herkese-rol-ver'
};
