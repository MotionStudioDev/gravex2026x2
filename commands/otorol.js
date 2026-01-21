const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Bu sistem için **Yönetici** yetkisi gereklidir.");
    }

    const guildId = message.guild.id;

    // --- KAPATMA KOMUTU (HIZLI ERİŞİM) ---
    if (args[0] === 'kapat') {
        await GuildSettings.findOneAndUpdate({ guildId }, { otorol: null, otorolLog: null });
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({ name: 'GraveOS Güvenlik', iconURL: client.user.displayAvatarURL() })
                .setDescription('🛑 **Otorol Sistemi Kapatıldı.**\nSunucuya katılan yeni üyelere artık otomatik rol tanımlanmayacak.')
                .setTimestamp()]
        });
    }

    // --- ANA DASHBOARD ---
    const settings = await GuildSettings.findOne({ guildId });
    
    const dashboardEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Otorol Kontrol Paneli', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTitle('🛰️ GraveOS Otorol Yapılandırması')
        .setDescription(
            'Sunucunuzun giriş güvenliğini ve otomatik rol dağıtımını buradan yönetin. Aşağıdaki interaktif menüleri kullanarak kurulumu tamamlayabilirsiniz.\n\n' +
            '**─── 📊 MEVCUT YAPILANDIRMA ───**\n' +
            `🔹 **Otorol Durumu:** ${settings?.otorol ? '`AKTİF` ✅' : '`PASİF` ❌'}\n` +
            `🔹 **Tanımlı Rol:** ${settings?.otorol ? `<@&${settings.otorol}>` : '`Belirlenmedi`'}\n` +
            `🔹 **Log Kanalı:** ${settings?.otorolLog ? `<#${settings.otorolLog}>` : '`Belirlenmedi`'}\n` +
            '**──────────────────────────**'
        )
        .addFields({ name: '💡 İpucu', value: 'Botun rolü, verilecek rolden daha üstte olmalıdır.' })
        .setFooter({ text: 'GraveOS • Yönetim Sistemi', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('setup_start').setLabel('Sistemi Yapılandır').setStyle(ButtonStyle.Primary).setEmoji('⚙️'),
        new ButtonBuilder().setCustomId('setup_close').setLabel('Kapat').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );

    const msg = await message.channel.send({ embeds: [dashboardEmbed], components: [mainRow] });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 120000 
    });

    collector.on('collect', async (i) => {
        
        // 🗑️ KAPATMA BUTONU
        if (i.customId === 'setup_close') {
            await GuildSettings.findOneAndUpdate({ guildId }, { otorol: null, otorolLog: null });
            return i.update({ 
                embeds: [new EmbedBuilder().setColor('Red').setDescription('✅ Otorol sistemi başarıyla sıfırlandı.')], 
                components: [] 
            });
        }

        // ⚙️ ROL SEÇİM ADIMI
        if (i.customId === 'setup_start') {
            const roles = message.guild.roles.cache
                .filter(r => r.name !== "@everyone" && !r.managed && r.position < message.guild.members.me.roles.highest.position)
                .first(25);

            const roleMenu = new StringSelectMenuBuilder()
                .setCustomId('select_role')
                .setPlaceholder('Girişte verilecek rolü seçin...')
                .addOptions(roles.map(r => ({ label: r.name, value: r.id, emoji: '👥' })));

            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('🎭 Adım 1: Rol Belirleme')
                    .setDescription('Lütfen yeni üyelere atanacak ana rolü seçiniz.')],
                components: [new ActionRowBuilder().addComponents(roleMenu)]
            });
        }

        // 📋 KANAL SEÇİM ADIMI
        if (i.customId === 'select_role') {
            const selectedRole = i.values[0];
            const channels = message.guild.channels.cache.filter(c => c.type === 0).first(25);

            const channelMenu = new StringSelectMenuBuilder()
                .setCustomId('select_channel')
                .setPlaceholder('Otorol log kanalını seçin...')
                .addOptions(channels.map(c => ({ 
                    label: `#${c.name}`, 
                    value: `${selectedRole}|${c.id}`, 
                    description: c.parent ? `Kategori: ${c.parent.name}` : 'Kategorisiz Kanal'
                })));

            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('📋 Adım 2: Raporlama')
                    .setDescription('Rol verildiğinde hangi kanala bilgi mesajı gönderilsin?')],
                components: [new ActionRowBuilder().addComponents(channelMenu)]
            });
        }

        // ✅ FİNAL KAYIT
        if (i.customId === 'select_channel') {
            const [roleId, channelId] = i.values[0].split('|');

            await GuildSettings.findOneAndUpdate(
                { guildId },
                { otorol: roleId, otorolLog: channelId },
                { upsert: true }
            );

            const successEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('💎 Yapılandırma Başarılı!')
                .setThumbnail('https://i.imgur.com/8Qf9X9S.png') // Başarı ikonu
                .setDescription('Otorol sistemi optimize edildi ve aktif duruma getirildi.')
                .addFields(
                    { name: '🔱 Atanan Rol', value: `<@&${roleId}>`, inline: true },
                    { name: '📡 Log Kanalı', value: `<#${channelId}>`, inline: true }
                )
                .setFooter({ text: 'GraveOS | Koruma Aktif' });

            await i.update({ embeds: [successEmbed], components: [] });
            collector.stop();
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ['otorol-setup'] };
module.exports.help = { name: 'otorol' };
