const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const UyeEtiket = require('../models/UyeEtiket');

module.exports = (client) => {
    // Üye katıldığında etiketleme sistemi
    client.on('guildMemberAdd', async (member) => {
        try {
            const guildId = member.guild.id;

            // MongoDB'den ayarları al
            const ayar = await UyeEtiket.findOne({ guildId, enabled: true });

            if (!ayar) return; // Kanal ayarlanmamışsa veya sistem kapalıysa çık

            const kanal = member.guild.channels.cache.get(ayar.channelId);
            if (!kanal) {
                // Kanal silinmişse veritabanından sil
                await UyeEtiket.deleteOne({ guildId });
                return;
            }

            // Üyeyi etiketle (embedsiz)
            const mesaj = await kanal.send(`${member}`);

            // Ayarlanan süre sonra sil (varsayılan 3 saniye)
            setTimeout(() => {
                mesaj.delete().catch(() => { });
            }, ayar.deleteAfter || 3000);

        } catch (err) {
            console.error('Üye etiket hatası:', err);
        }
    });
};

// Komut yapısı
module.exports.run = async (client, message, args) => {
    // Yetki kontrolü
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const yetkiEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Yetki Hatası')
            .setDescription('> Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!')
            .setFooter({ text: 'GraveBOT Güvenlik Sistemi' })
            .setTimestamp();
        return message.channel.send({ embeds: [yetkiEmbed] });
    }

    const guildId = message.guild.id;

    // Kullanım: g!üyeetiket ayarla #kanal veya g!üyeetiket kapat
    if (!args[0]) {
        try {
            const ayar = await UyeEtiket.findOne({ guildId });

            const durumEmbed = new EmbedBuilder()
                .setColor('#00ffcc')
                .setAuthor({ name: 'Üye Etiket Sistemi', iconURL: client.user.displayAvatarURL() })
                .setTitle('⚙️ Sistem Durumu')
                .setDescription(
                    ayar && ayar.enabled
                        ? `> **Durum:** 🟢 Aktif\n> **Kanal:** <#${ayar.channelId}>\n> **Silme Süresi:** ${ayar.deleteAfter / 1000} saniye`
                        : `> **Durum:** 🔴 Kapalı\n> **Bilgi:** Sistem şu anda devre dışı`
                )
                .addFields(
                    {
                        name: '📋 Kullanım',
                        value: '```\ng!üyeetiket ayarla #kanal - Kanalı ayarla\ng!üyeetiket kapat - Sistemi kapat\ng!üyeetiket süre <saniye> - Silme süresini ayarla\n```',
                        inline: false
                    },
                    {
                        name: '💡 Bilgi',
                        value: '> Yeni üyeler katıldığında belirlenen kanalda etiketlenip ayarlanan süre sonra mesaj silinir.',
                        inline: false
                    }
                )
                .setFooter({ text: 'GraveBOT Üye Yönetim Sistemi • MongoDB' })
                .setTimestamp();
            return message.channel.send({ embeds: [durumEmbed] });
        } catch (err) {
            console.error('MongoDB hatası:', err);
            const hataEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Veritabanı Hatası')
                .setDescription('> Veritabanına erişilirken bir hata oluştu!')
                .setFooter({ text: 'GraveBOT Hata Sistemi' })
                .setTimestamp();
            return message.channel.send({ embeds: [hataEmbed] });
        }
    }

    // Kanal ayarlama
    if (args[0] === 'ayarla') {
        const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

        if (!kanal) {
            const hataEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Hata')
                .setDescription('> Lütfen geçerli bir kanal etiketle veya ID gir!')
                .addFields({
                    name: '📝 Örnek Kullanım',
                    value: '```\ng!üyeetiket ayarla #hoşgeldin\ng!üyeetiket ayarla 1234567890\n```'
                })
                .setFooter({ text: 'GraveBOT Hata Sistemi' })
                .setTimestamp();
            return message.channel.send({ embeds: [hataEmbed] });
        }

        // Botun kanala mesaj gönderme yetkisi var mı kontrol et
        const botPerms = kanal.permissionsFor(message.guild.members.me);
        if (!botPerms.has(PermissionsBitField.Flags.SendMessages) || !botPerms.has(PermissionsBitField.Flags.ManageMessages)) {
            const yetkiHataEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('⚠️ Yetki Eksik')
                .setDescription(`> ${kanal} kanalında **Mesaj Gönder** ve **Mesajları Yönet** yetkilerim yok!`)
                .addFields({
                    name: '🔧 Çözüm',
                    value: '> Lütfen bot rolüne gerekli yetkileri ver veya başka bir kanal seç.'
                })
                .setFooter({ text: 'GraveBOT Yetki Kontrolü' })
                .setTimestamp();
            return message.channel.send({ embeds: [yetkiHataEmbed] });
        }

        try {
            // MongoDB'de güncelle veya oluştur
            await UyeEtiket.findOneAndUpdate(
                { guildId },
                {
                    channelId: kanal.id,
                    enabled: true,
                    updatedAt: Date.now()
                },
                { upsert: true, new: true }
            );

            const basariliEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setAuthor({ name: 'Sistem Aktif', iconURL: client.user.displayAvatarURL() })
                .setTitle('✅ Kanal Ayarlandı')
                .setDescription(`> Üye etiket sistemi başarıyla yapılandırıldı!`)
                .addFields(
                    { name: '📍 Kanal', value: `> ${kanal}`, inline: true },
                    { name: '⏱️ Silme Süresi', value: `> 3 saniye`, inline: true },
                    { name: '🔔 Durum', value: `> 🟢 Aktif`, inline: true }
                )
                .setFooter({ text: 'GraveBOT Yapılandırma Sistemi • MongoDB' })
                .setTimestamp();

            return message.channel.send({ embeds: [basariliEmbed] });
        } catch (err) {
            console.error('MongoDB kayıt hatası:', err);
            const hataEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Kayıt Hatası')
                .setDescription('> Ayarlar kaydedilirken bir hata oluştu!')
                .setFooter({ text: 'GraveBOT Hata Sistemi' })
                .setTimestamp();
            return message.channel.send({ embeds: [hataEmbed] });
        }
    }

    // Silme süresini ayarlama
    if (args[0] === 'süre' || args[0] === 'sure') {
        const saniye = parseInt(args[1]);

        if (!saniye || saniye < 1 || saniye > 60) {
            const hataEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Geçersiz Süre')
                .setDescription('> Lütfen 1-60 saniye arasında bir değer gir!')
                .addFields({
                    name: '📝 Örnek Kullanım',
                    value: '```\ng!üyeetiket süre 5\ng!üyeetiket süre 10\n```'
                })
                .setFooter({ text: 'GraveBOT Hata Sistemi' })
                .setTimestamp();
            return message.channel.send({ embeds: [hataEmbed] });
        }

        try {
            const ayar = await UyeEtiket.findOne({ guildId });

            if (!ayar) {
                const hataEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Sistem Kapalı')
                    .setDescription('> Önce bir kanal ayarlamalısın!')
                    .addFields({
                        name: '💡 İpucu',
                        value: '```\ng!üyeetiket ayarla #kanal\n```'
                    })
                    .setFooter({ text: 'GraveBOT Hata Sistemi' })
                    .setTimestamp();
                return message.channel.send({ embeds: [hataEmbed] });
            }

            await UyeEtiket.findOneAndUpdate(
                { guildId },
                { deleteAfter: saniye * 1000, updatedAt: Date.now() }
            );

            const basariliEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Süre Güncellendi')
                .setDescription(`> Mesaj silme süresi **${saniye} saniye** olarak ayarlandı!`)
                .addFields({
                    name: '📊 Bilgi',
                    value: `> Artık üye etiket mesajları ${saniye} saniye sonra silinecek.`
                })
                .setFooter({ text: 'GraveBOT Yapılandırma Sistemi • MongoDB' })
                .setTimestamp();

            return message.channel.send({ embeds: [basariliEmbed] });
        } catch (err) {
            console.error('MongoDB güncelleme hatası:', err);
            const hataEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Güncelleme Hatası')
                .setDescription('> Süre güncellenirken bir hata oluştu!')
                .setFooter({ text: 'GraveBOT Hata Sistemi' })
                .setTimestamp();
            return message.channel.send({ embeds: [hataEmbed] });
        }
    }

    // Sistemi kapatma
    if (args[0] === 'kapat') {
        try {
            const ayar = await UyeEtiket.findOne({ guildId });

            if (!ayar || !ayar.enabled) {
                const zatenKapaliEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Uyarı')
                    .setDescription('> Sistem zaten kapalı!')
                    .setFooter({ text: 'GraveBOT Durum Kontrolü' })
                    .setTimestamp();
                return message.channel.send({ embeds: [zatenKapaliEmbed] });
            }

            await UyeEtiket.findOneAndUpdate(
                { guildId },
                { enabled: false, updatedAt: Date.now() }
            );

            const kapatildiEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'Sistem Devre Dışı', iconURL: client.user.displayAvatarURL() })
                .setTitle('🔴 Sistem Kapatıldı')
                .setDescription('> Üye etiket sistemi başarıyla devre dışı bırakıldı.')
                .addFields({
                    name: '📊 Bilgi',
                    value: '> Artık yeni üyeler katıldığında etiketlenmeyecek.'
                })
                .setFooter({ text: 'GraveBOT Yapılandırma Sistemi • MongoDB' })
                .setTimestamp();

            return message.channel.send({ embeds: [kapatildiEmbed] });
        } catch (err) {
            console.error('MongoDB güncelleme hatası:', err);
            const hataEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Güncelleme Hatası')
                .setDescription('> Sistem kapatılırken bir hata oluştu!')
                .setFooter({ text: 'GraveBOT Hata Sistemi' })
                .setTimestamp();
            return message.channel.send({ embeds: [hataEmbed] });
        }
    }

    // Geçersiz argüman
    const gecersizEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Geçersiz Kullanım')
        .setDescription('> Lütfen geçerli bir argüman kullan!')
        .addFields({
            name: '📋 Kullanılabilir Komutlar',
            value: '```\ng!üyeetiket - Durum görüntüle\ng!üyeetiket ayarla #kanal - Kanal ayarla\ng!üyeetiket süre <saniye> - Silme süresini ayarla\ng!üyeetiket kapat - Sistemi kapat\n```'
        })
        .setFooter({ text: 'GraveBOT Yardım Sistemi • MongoDB' })
        .setTimestamp();

    return message.channel.send({ embeds: [gecersizEmbed] });
};

module.exports.conf = {
    aliases: ['uyeetiket', 'membertag', 'üye-etiket', 'hoşgeldin-etiket']
};

module.exports.help = {
    name: 'üyeetiket',
    description: 'Sunucuya katılan üyeleri belirtilen kanalda etiketler ve mesajı siler (MongoDB)'
};
