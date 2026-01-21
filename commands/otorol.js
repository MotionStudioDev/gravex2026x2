const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField, ComponentType } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
    // 1. YETKİ KONTROLÜ
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Bu sistemi yönetmek için **Yönetici** yetkisine sahip olmalısın!");
    }

    const sub = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    // =========================================================
    // ✅ KAPATMA KOMUTU (DİREKT ÇALIŞIR)
    // =========================================================
    if (sub === 'kapat') {
        await GuildSettings.findOneAndUpdate(
            { guildId },
            { otorol: null, otorolLog: null },
            { upsert: true }
        );
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('🗑️ Otorol Devre Dışı')
                    .setDescription('Otorol sistemi ve log kanalı başarıyla sıfırlandı. Yeni gelenlere rol verilmeyecek.')
                    .setFooter({ text: 'GraveOS Otorol Sistemi' })
            ]
        });
    }

    // =========================================================
    // 🚀 ANA KURULUM VE GÜNCELLEME PANELİ
    // =========================================================
    const settings = await GuildSettings.findOne({ guildId });
    
    const anaEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setTitle('⚙️ Otorol Yapılandırma Paneli')
        .setDescription(
            'Sunucuna yeni katılan üyelere otomatik rol vermek için kurulumu başlatın.\n\n' +
            `📊 **Mevcut Durum:**\n` +
            `• **Rol:** ${settings?.otorol ? `<@&${settings.otorol}>` : '`Ayarlanmamış`'}\n` +
            `• **Log:** ${settings?.otorolLog ? `<#${settings.otorolLog}>` : '`Ayarlanmamış`'}\n\n` +
            'İşlemi başlatmak için aşağıdaki **KURULUM** butonuna tıklayın.'
        )
        .setFooter({ text: 'Kapatmak için: g!otorol kapat' });

    const ilkRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('oto_kur').setLabel('KURULUMU BAŞLAT').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('oto_iptal').setLabel('VAZGEÇ').setStyle(ButtonStyle.Danger)
    );

    const anaMsg = await message.channel.send({ embeds: [anaEmbed], components: [ilkRow] });

    const collector = anaMsg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 60000 
    });

    collector.on('collect', async (i) => {
        
        // ❌ İPTAL
        if (i.customId === 'oto_iptal') {
            await i.update({ content: '❌ İşlem kullanıcı tarafından iptal edildi.', embeds: [], components: [] });
            return collector.stop();
        }

        // 🛠️ ROL SEÇİMİ (MENÜ)
        if (i.customId === 'oto_kur') {
            const roller = message.guild.roles.cache
                .filter(r => r.name !== "@everyone" && !r.managed && r.position < message.guild.members.me.roles.highest.position)
                .first(25);

            if (roller.length === 0) return i.reply({ content: "Seçilebilir rol bulunamadı (Botun yetkisi rollerin üstünde olmalı!)", ephemeral: true });

            const rolMenusu = new StringSelectMenuBuilder()
                .setCustomId('rol_secimi')
                .setPlaceholder('Verilecek rolü listeden seçin...')
                .addOptions(roller.map(r => ({ label: r.name, value: r.id })));

            await i.update({
                embeds: [new EmbedBuilder().setColor('Blue').setTitle('🎭 Adım 1: Rol Seçimi').setDescription('Üyelere otomatik verilecek rolü seçin:')],
                components: [new ActionRowBuilder().addComponents(rolMenusu)]
            });
        }

        // 📂 KANAL SEÇİMİ (MENÜ)
        if (i.customId === 'rol_secimi') {
            const secilenRol = i.values[0];
            const kanallar = message.guild.channels.cache.filter(c => c.type === 0).first(25);

            const kanalMenusu = new StringSelectMenuBuilder()
                .setCustomId('kanal_secimi_oto')
                .setPlaceholder('Log kanalını listeden seçin...')
                .addOptions(kanallar.map(c => ({ 
                    label: `#${c.name}`, 
                    value: `${secilenRol}_${c.id}`, // Rol ve Kanal ID'sini birleşik taşıyoruz
                    description: c.parent ? `${c.parent.name} kategorisinde` : 'Kategorisiz'
                })));

            await i.update({
                embeds: [new EmbedBuilder().setColor('Blue').setTitle('📋 Adım 2: Log Kanalı').setDescription('İşlemlerin raporlanacağı kanalı seçin:')],
                components: [new ActionRowBuilder().addComponents(kanalMenusu)]
            });
        }

        // ✅ TAMAMLA VE KAYDET
        if (i.customId === 'kanal_secimi_oto') {
            const [rolId, kanalId] = i.values[0].split('_');

            await GuildSettings.findOneAndUpdate(
                { guildId },
                { otorol: rolId, otorolLog: kanalId },
                { upsert: true }
            );

            const finalEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Otorol Başarıyla Ayarlandı')
                .addFields(
                    { name: 'Seçilen Rol', value: `<@&${rolId}>`, inline: true },
                    { name: 'Log Kanalı', value: `<#${kanalId}>`, inline: true }
                )
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: 'GraveOS Güvenlik ve Yönetim' });

            await i.update({ content: null, embeds: [finalEmbed], components: [] });
            collector.stop();
        }
    });

    collector.on('end', (c, reason) => {
        if (reason === 'time') anaMsg.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ['otorol-ayarla', 'auto-role'] };
module.exports.help = { name: 'otorol' };
