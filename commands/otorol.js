const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField, ComponentType } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const guildId = message.guild.id;

    // --- KAPATMA KOMUTU (GELİŞMİŞ) ---
    if (args[0] === 'kapat') {
        await GuildSettings.findOneAndUpdate({ guildId }, { otorol: null, otorolLog: null });
        return message.reply({
            embeds: [new EmbedBuilder().setColor('#FF4B4B').setDescription('🗑️ **Otorol Sistemi Kapatıldı.** Veritabanı kayıtları temizlendi.')]
        });
    }

    // --- İLK DURUM ANALİZİ ---
    const settings = await GuildSettings.findOne({ guildId });
    let selection = { roleId: settings?.otorol || null, channelId: settings?.otorolLog || null };

    const generateMainEmbed = (step = "DASHBOARD") => {
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'GraveOS Otorol Denetleme Merkezi', iconURL: client.user.displayAvatarURL() })
            .setTitle(step === "DASHBOARD" ? '📊 Sistem Durum Raporu' : '🛠️ Yapılandırma Sihirbazı')
            .setColor('#2F3136')
            .setDescription(`**──────────────────────────**\n` +
                `🛰️ **Sistem:** \`Grave-Otorol Engine v3.0\`\n` +
                `📡 **Durum:** ${selection.roleId ? '`AKTİF` ✅' : '`YAPILANDIRILMAMIŞ` ⚠️'}\n` +
                `**──────────────────────────**\n` +
                `🎭 **Hedef Rol:** ${selection.roleId ? `<@&${selection.roleId}>` : '`Seçilmedi`'}\n` +
                `📂 **Log Kanalı:** ${selection.channelId ? `<#${selection.channelId}>` : '`Seçilmedi`'}\n` +
                `**──────────────────────────**`)
            .setFooter({ text: 'GraveOS • Ultra Gelişmiş Yönetim Paneli' })
            .setTimestamp();
        
        if (step === "SUMMARY") embed.setColor('#5865F2').setTitle('📋 Yapılandırma Özeti');
        return embed;
    };

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('start_wizard').setLabel('Sihirbazı Başlat').setStyle(ButtonStyle.Primary).setEmoji('🚀'),
        new ButtonBuilder().setCustomId('quick_close').setLabel('Sistemi Devre Dışı Bırak').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    const msg = await message.channel.send({ embeds: [generateMainEmbed()], components: [mainRow] });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 180000 
    });

    collector.on('collect', async (i) => {
        // 1. ADIM: ROL SEÇİMİ
        if (i.customId === 'start_wizard' || i.customId === 'back_to_roles') {
            const roles = message.guild.roles.cache
                .filter(r => r.name !== "@everyone" && !r.managed && r.position < message.guild.members.me.roles.highest.position)
                .first(25);

            const roleMenu = new StringSelectMenuBuilder()
                .setCustomId('step_role')
                .setPlaceholder('🛡️ Atanacak rolü seçiniz...')
                .addOptions(roles.map(r => ({
                    label: r.name,
                    value: r.id,
                    description: `Üye Sayısı: ${r.members.size} | ID: ${r.id}`,
                    emoji: '👤'
                })));

            await i.update({
                embeds: [generateMainEmbed("ADIM 1: ROL SEÇİMİ").setDescription('**[ 1 / 3 ]**\n\nSunucuya yeni giren üyelere hangi rolün verilmesini istersiniz?\n*Not: Botun yetkisi seçilen rolden üstte olmalıdır.*')],
                components: [new ActionRowBuilder().addComponents(roleMenu)]
            });
        }

        // 2. ADIM: KANAL SEÇİMİ
        if (i.customId === 'step_role') {
            selection.roleId = i.values[0];
            const channels = message.guild.channels.cache.filter(c => c.type === 0).first(25);

            const channelMenu = new StringSelectMenuBuilder()
                .setCustomId('step_channel')
                .setPlaceholder('📡 Log kanalını seçiniz...')
                .addOptions(channels.map(c => ({
                    label: `#${c.name}`,
                    value: c.id,
                    description: `Kategori: ${c.parent?.name || 'Yok'}`,
                    emoji: '📩'
                })));

            await i.update({
                embeds: [generateMainEmbed("ADIM 2: LOG SEÇİMİ").setDescription('**[ 2 / 3 ]**\n\nİşlem sonuçlarının hangi kanala raporlanmasını istersiniz?')],
                components: [new ActionRowBuilder().addComponents(channelMenu)]
            });
        }

        // 3. ADIM: ÖZET VE ONAY
        if (i.customId === 'step_channel') {
            selection.channelId = i.values[0];

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('final_save').setLabel('Ayarları Kaydet ve Başlat').setStyle(ButtonStyle.Success).setEmoji('💾'),
                new ButtonBuilder().setCustomId('start_wizard').setLabel('Baştan Başla').setStyle(ButtonStyle.Secondary).setEmoji('🔄')
            );

            await i.update({
                embeds: [generateMainEmbed("SUMMARY")],
                components: [confirmRow]
            });
        }

        // FİNAL: KAYIT
        if (i.customId === 'final_save') {
            await GuildSettings.findOneAndUpdate(
                { guildId },
                { otorol: selection.roleId, otorolLog: selection.channelId },
                { upsert: true }
            );

            const finishEmbed = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle('💎 Sistem Başarıyla Devreye Alındı')
                .setDescription('Seçtiğiniz yapılandırma ayarları MongoDB üzerine mühürlendi. Artık her yeni üye otomatik olarak yetkilendirilecek.')
                .addFields(
                    { name: '✅ İşlem', value: 'Otorol Kurulumu', inline: true },
                    { name: '🛠️ Modül', value: 'Apex-Engine v3', inline: true }
                );

            await i.update({ embeds: [finishEmbed], components: [] });
            collector.stop();
        }

        // SİSTEMİ KAPATMA (BUTONDAN)
        if (i.customId === 'quick_close') {
            await GuildSettings.findOneAndUpdate({ guildId }, { otorol: null, otorolLog: null });
            await i.update({ content: '🛑 Sistem pasifleştirildi.', embeds: [], components: [] });
            collector.stop();
        }
    });
};

module.exports.conf = { aliases: ['oto-setup', 'advanced-role'] };
module.exports.help = { name: 'otorol' };
