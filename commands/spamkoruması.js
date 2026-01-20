const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
    // 1. YETKİ KONTROLÜ
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Bu sistemi yönetmek için **Yönetici** yetkisine sahip olmalısın!");
    }

    const ayarlar = await GuildSettings.findOne({ guildId: message.guild.id });

    // 2. KAPATMA İŞLEMİ (g!spamkoruması kapat)
    if (args[0] === "kapat") {
        if (!ayarlar || !ayarlar.spamSistemi) {
            return message.reply("⚠️ Spam koruması zaten şu anda kapalı!");
        }

        const kapatEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('🛡️ Sistem Kapatma Onayı')
            .setDescription('Spam koruma sistemini kapatmak üzeresiniz. Sunucu korumasız kalacaktır!\n\n**Onaylıyor musunuz?**');

        const kapatRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('spam_kapat_onay').setLabel('SİSTEMİ KAPAT').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('spam_kapat_iptal').setLabel('VAZGEÇ').setStyle(ButtonStyle.Secondary)
        );

        const kapatMsg = await message.channel.send({ embeds: [kapatEmbed], components: [kapatRow] });

        const kapatCol = kapatMsg.createMessageComponentCollector({ 
            filter: i => i.user.id === message.author.id, 
            time: 30000 
        });

        kapatCol.on('collect', async (i) => {
            if (i.customId === 'spam_kapat_onay') {
                await GuildSettings.findOneAndUpdate(
                    { guildId: message.guild.id },
                    { spamSistemi: false, spamLogKanali: null }
                );
                await i.update({ content: '✅ **Spam koruması başarıyla devre dışı bırakıldı.**', embeds: [], components: [] });
            } else {
                await i.update({ content: 'İşlem iptal edildi, koruma hala aktif.', embeds: [], components: [] });
            }
            kapatCol.stop();
        });
        return;
    }

    // 3. AÇMA VE KURULUM İŞLEMİ (Onaylı & Menülü)
    const baslangicEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setTitle('⚠️ GraveOS | Güvenlik Yapılandırması')
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(
            'Sunucuda **Ultra Spam Koruması** aktif edilmek üzere!\n\n' +
            '🚀 **Sistem İşleyişi:**\n' +
            '• **1. İhlal:** Otomatik 10 Dakika Timeout.\n' +
            '• **2. İhlal:** DM Bilgilendirme + Sunucudan Kalıcı Ban.\n\n' +
            'Onaylıyorsanız **EVET**, iptal etmek için **HAYIR** tuşuna basınız.'
        )
        .setFooter({ text: 'Kapatmak için: g!spamkoruması kapat' });

    const onaySatiri = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('spam_onay').setLabel('EVET, KURULUMU BAŞLAT').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('spam_red').setLabel('HAYIR, İPTAL ET').setStyle(ButtonStyle.Danger)
    );

    const anaMesaj = await message.channel.send({ embeds: [baslangicEmbed], components: [onaySatiri] });

    const collector = anaMesaj.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 60000 
    });

    collector.on('collect', async (i) => {
        // İptal Etme
        if (i.customId === 'spam_red') {
            await i.update({ content: '❌ Kurulum işlemi kullanıcı tarafından iptal edildi.', embeds: [], components: [] });
            return collector.stop();
        }

        // Onay ve Kanal Seçimi
        if (i.customId === 'spam_onay') {
            const yazıKanalları = message.guild.channels.cache
                .filter(c => c.type === 0)
                .first(25);

            if (yazıKanalları.length === 0) return i.reply({ content: "Hata: Sunucuda yazı kanalı bulunamadı!", ephemeral: true });

            const kanalMenusu = new StringSelectMenuBuilder()
                .setCustomId('kanal_secimi')
                .setPlaceholder('Logların tutulacağı kanalı seçin...')
                .addOptions(
                    yazıKanalları.map(kanal => ({
                        label: `#${kanal.name}`,
                        value: kanal.id,
                        description: kanal.parent ? `${kanal.parent.name} kategorisi` : 'Kategorisiz kanal'
                    }))
                );

            const menuSatiri = new ActionRowBuilder().addComponents(kanalMenusu);

            await i.update({
                content: '📢 **Harika!** Şimdi spam ihlallerinin gönderileceği **Log kanalını** aşağıdan seçiniz.',
                embeds: [],
                components: [menuSatiri]
            });
        }

        // Kanal Seçildiğinde MongoDB Kayıt
        if (i.customId === 'kanal_secimi') {
            const secilenKanalId = i.values[0];

            await GuildSettings.findOneAndUpdate(
                { guildId: message.guild.id },
                { spamSistemi: true, spamLogKanali: secilenKanalId },
                { upsert: true }
            );

            await i.update({
                content: `✅ **Kurulum Tamamlandı!**\n\n🛡️ Spam koruması aktif.\n📋 Log Kanalı: <#${secilenKanalId}>\n⚖️ Ceza Kademesi: **Timeout ➔ Ban**`,
                components: []
            });
            
            collector.stop();
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            anaMesaj.edit({ content: '⌛ Süre doldu, işlem iptal edildi.', embeds: [], components: [] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['antispam', 'spam-sistemi']
};

module.exports.help = {
    name: 'spamkoruması'
};
