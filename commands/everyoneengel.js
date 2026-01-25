const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    PermissionsBitField,
    UserSelectMenuBuilder,
    RoleSelectMenuBuilder
} = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
    // Sadece yönetici yetkisi olanlar kullanabilir
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const guildId = message.guild.id;
    
    // Veritabanı kontrolü
    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) {
        settings = await GuildSettings.create({ guildId });
    }

    // --- ANA PANEL EMBED ---
    const generateEmbed = () => {
        const whitelistGosterim = settings.everyoneWhitelist?.length > 0 
            ? settings.everyoneWhitelist.map(id => `<@${id}> | <@&${id}>`).join('\n') 
            : '`Liste Boş`';

        return new EmbedBuilder()
            .setAuthor({ name: 'GraveOS | Mentions Security Panel', iconURL: client.user.displayAvatarURL() })
            .setTitle('🛡️ Everyone & Here Koruma Sistemi')
            .setColor(settings.everyoneEngel ? '#57F287' : '#ED4245')
            .setDescription(
                `Sunucuda izinsiz @everyone veya @here atılmasını engellemek için bu paneli kullanın.\n\n` +
                `**─── 📝 SİSTEM DURUMU ───**\n` +
                `🔹 **Durum:** ${settings.everyoneEngel ? '`AKTİF` ✅' : '`KAPALI` ❌'}\n` +
                `🔹 **Aktif Ceza:** \`${(settings.everyoneCeza || 'UYARI').toUpperCase()}\`\n` +
                `🔹 **Log Kanalı:** ${settings.everyoneLog ? `<#${settings.everyoneLog}>` : '`Ayarlanmamış`'}\n\n` +
                `**─── ⚪ BEYAZ LİSTE ───**\n` +
                `${whitelistGosterim}\n` +
                `**──────────────────────────**`
            )
            .setFooter({ text: 'GraveOS • Ultra Mega Güvenlik Modülü', iconURL: message.guild.iconURL() })
            .setTimestamp();
    };

    // --- BUTON SIRALARI ---
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ev_toggle')
            .setLabel(settings.everyoneEngel ? 'Sistemi Kapat' : 'Sistemi Aç')
            .setStyle(settings.everyoneEngel ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(settings.everyoneEngel ? '🔒' : '🔓'),
        new ButtonBuilder()
            .setCustomId('ev_ceza_menu')
            .setLabel('Ceza Türü')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⚖️'),
        new ButtonBuilder()
            .setCustomId('ev_log_menu')
            .setLabel('Log Kanalı')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ev_white_user')
            .setLabel('Kullanıcı Whitelist')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👤'),
        new ButtonBuilder()
            .setCustomId('ev_white_role')
            .setLabel('Rol Whitelist')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👥')
    );

    const msg = await message.channel.send({ embeds: [generateEmbed()], components: [row1, row2] });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 300000 
    });

    collector.on('collect', async (i) => {
        
        // SİSTEMİ AÇ / KAPAT
        if (i.customId === 'ev_toggle') {
            settings.everyoneEngel = !settings.everyoneEngel;
            await settings.save();
            return i.update({ embeds: [generateEmbed()], components: [row1, row2] });
        }

        // CEZA SEÇİM MENÜSÜ
        if (i.customId === 'ev_ceza_menu') {
            const cezaMenu = new StringSelectMenuBuilder()
                .setCustomId('ev_set_ceza')
                .setPlaceholder('Uygulanacak cezayı seçiniz...')
                .addOptions([
                    { label: 'Sadece Uyarı & Silme', value: 'uyarı', description: 'Mesajı siler ve uyarır.', emoji: '⚠️' },
                    { label: '10 Dakika Timeout', value: 'timeout', description: 'Kullanıcıyı 10dk susturur.', emoji: '⏳' },
                    { label: 'Kick (Atma)', value: 'kick', description: 'Kullanıcıyı sunucudan atar.', emoji: '👢' },
                    { label: 'Ban (Yasaklama)', value: 'ban', description: 'Kullanıcıyı kalıcı yasaklar.', emoji: '🔨' }
                ]);
            return i.update({ components: [new ActionRowBuilder().addComponents(cezaMenu)] });
        }

        if (i.customId === 'ev_set_ceza') {
            settings.everyoneCeza = i.values[0];
            await settings.save();
            return i.update({ embeds: [generateEmbed()], components: [row1, row2] });
        }

        // LOG KANALI SEÇİMİ
        if (i.customId === 'ev_log_menu') {
            const channels = message.guild.channels.cache.filter(c => c.type === 0).first(25);
            const logMenu = new StringSelectMenuBuilder()
                .setCustomId('ev_set_log')
                .setPlaceholder('Log kanalı seçin...')
                .addOptions(channels.map(c => ({ label: `#${c.name}`, value: c.id, emoji: '📡' })));
            return i.update({ components: [new ActionRowBuilder().addComponents(logMenu)] });
        }

        if (i.customId === 'ev_set_log') {
            settings.everyoneLog = i.values[0];
            await settings.save();
            return i.update({ embeds: [generateEmbed()], components: [row1, row2] });
        }

        // BEYAZ LİSTE: KULLANICI EKLE/ÇIKAR
        if (i.customId === 'ev_white_user') {
            const userSelect = new UserSelectMenuBuilder()
                .setCustomId('ev_set_white_user')
                .setPlaceholder('Kullanıcı seçerek listeyi güncelleyin...')
                .setMaxValues(1);
            return i.update({ components: [new ActionRowBuilder().addComponents(userSelect)] });
        }

        if (i.customId === 'ev_set_white_user') {
            const id = i.values[0];
            if (settings.everyoneWhitelist.includes(id)) {
                settings.everyoneWhitelist = settings.everyoneWhitelist.filter(x => x !== id);
            } else {
                settings.everyoneWhitelist.push(id);
            }
            await settings.save();
            return i.update({ embeds: [generateEmbed()], components: [row1, row2] });
        }

        // BEYAZ LİSTE: ROL EKLE/ÇIKAR
        if (i.customId === 'ev_white_role') {
            const roleSelect = new RoleSelectMenuBuilder()
                .setCustomId('ev_set_white_role')
                .setPlaceholder('Rol seçerek listeyi güncelleyin...')
                .setMaxValues(1);
            return i.update({ components: [new ActionRowBuilder().addComponents(roleSelect)] });
        }

        if (i.customId === 'ev_set_white_role') {
            const id = i.values[0];
            if (settings.everyoneWhitelist.includes(id)) {
                settings.everyoneWhitelist = settings.everyoneWhitelist.filter(x => x !== id);
            } else {
                settings.everyoneWhitelist.push(id);
            }
            await settings.save();
            return i.update({ embeds: [generateEmbed()], components: [row1, row2] });
        }
    });
};

module.exports.conf = { aliases: ['everyone-engel', 'antimention'] };
module.exports.help = { name: 'everyoneengel' };
