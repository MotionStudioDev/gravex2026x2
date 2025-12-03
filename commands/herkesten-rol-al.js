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
            .setDescription('Rol belirtilmedi.\n\n**Doğru kullanım:** `g!herkesten-rol-al @rol`');
        return message.channel.send({ embeds: [embed] });
    }
    
    // --- HATA KONTROLÜ (Rol Hiyerarşisi) ---
    // Botun rolü, alınacak rolden daha yüksek olmalı
    if (role.position >= message.guild.members.me.roles.highest.position) {
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Yetki Hiyerarşisi')
            .setDescription(`Benim rolüm (${message.guild.members.me.roles.highest}), ${role} rolünden daha düşük veya onunla eşit. Bu rolü geri alamam.`);
        return message.channel.send({ embeds: [embed] });
    }
    
    // Alınacak role sahip olan üyelerin sayısını bulma
    const membersWithRole = message.guild.members.cache.filter(member => member.roles.cache.has(role.id));
    const targetCount = membersWithRole.size;

    if (targetCount === 0) {
        const embed = new EmbedBuilder()
            .setColor('Orange')
            .setTitle('ℹ️ Hedef Üye Yok')
            .setDescription(`Sunucuda \`${role.name}\` rolüne sahip hiçbir üye bulunamadı. İşlem başlatılmadı.`);
        return message.channel.send({ embeds: [embed] });
    }
    
    // --- ONAY AŞAMASI (Toplu İşlem Uyarısı) ---

    const onayEmbed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('⚠️ TOPLU ROL ALMA ONAYI GEREKLİ')
        .setDescription(`
        **DİKKAT!** Bu işlem, sunucudaki **${targetCount}** üyeden \`${role.name}\` rolünü geri almaya çalışacaktır.

        Bu işlemi onaylıyor musunuz?
        `)
        .addFields(
            { name: 'Alınacak Rol', value: `${role.name} (${role.id})`, inline: false },
            { name: 'Hedef Üye Sayısı', value: `${targetCount} üye`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Onaylamak için 30 saniyeniz var. İptal edilebilir bir işlemdir.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('herkesten_rolal_onay').setLabel('✅ EMINIM, ONAYLA').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('herkesten_rolal_reddet').setLabel('❌ İPTAL ET').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [onayEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.customId === 'herkesten_rolal_onay' || i.customId === 'herkesten_rolal_reddet',
        time: 30000 
    });

    collector.on('collect', async i => {
        // Sadece komutu kullanan yetkilinin butonlara basmasını sağla
        if (i.user.id !== message.author.id) {
            return i.reply({ content: 'Bu butonları sadece işlemi başlatan yetkili kullanabilir.', ephemeral: true });
        }

        collector.stop(); // Onay veya Red işlemi yapıldıysa dinlemeyi durdur

        if (i.customId === 'herkesten_rolal_onay') {
            await i.update({ 
                embeds: [new EmbedBuilder().setColor('Yellow').setTitle('🔄 İşlem Başlatıldı').setDescription('Toplu rol alma işlemi başlatılıyor, lütfen bekleyin...')], 
                components: [] 
            });

            let removedCount = 0;
            let errorCount = 0;

            // --- TOPLU ROL ALMA İŞLEMİ ---
            // Sadece role sahip olan üyeler üzerinde döngüye gir
            for (const [memberID, member] of membersWithRole) {
                // Botun kendisi değilse rolü almaya çalış
                if (member.user.id !== client.user.id) {
                    try {
                        await member.roles.remove(role);
                        removedCount++;
                    } catch (err) {
                        // Hata oluşursa (örn: botun rol hiyerarşisi nedeniyle), sayacı artır ve devam et
                        errorCount++;
                        console.error(`Üyeden rol alınamadı (${member.user.tag}): ${err.message}`);
                    }
                }
            }
            // --- İŞLEM SONUÇLANDI ---

            const tarih = moment().format('DD.MM.YYYY HH:mm:ss');
            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ TOPLU ROL ALMA TAMAMLANDI')
                .addFields(
                    { name: 'İşlem Durumu', value: 'Başarıyla tamamlandı.', inline: false },
                    { name: 'Alınan Rol', value: `${role.name}`, inline: true },
                    { name: 'Rol Alınan Üye', value: `${removedCount} kişi`, inline: true },
                    { name: 'Hata Sayısı', value: `${errorCount} kişi`, inline: true },
                    { name: 'Yetkili', value: `${message.author.tag}`, inline: false },
                    { name: 'Tarih', value: tarih, inline: false }
                )
                .setFooter({ text: 'Grsve Toplu rol yönetim sistemi' });

            await msg.edit({ embeds: [successEmbed] });

        } else if (i.customId === 'herkesten_rolal_reddet') {
            const rejectEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ İşlem İptal Edildi')
                .setDescription(`${message.author} işlemi **iptal etmeyi** seçti. Toplu rol alma işlemi başlamadı.`);
            
            await i.update({ embeds: [rejectEmbed], components: [] });
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('Grey')
                .setTitle('⏱️ İşlem Zaman Aşımı')
                .setDescription('Onay süresi dolduğu için toplu rol alma işlemi otomatik olarak iptal edildi.');
            
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
    aliases: ['herkesten-rolal', 'massroleremove']
};

module.exports.help = {
    name: 'herkesten-rol-al'
};
