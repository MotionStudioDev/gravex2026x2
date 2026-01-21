const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const guildId = message.guild.id;
    const botUser = client.user;

    // --- GENEL TASARIM ŞABLONU ---
    const createBaseEmbed = () => new EmbedBuilder()
        .setAuthor({ name: 'GraveOS | Otorol Yönetim Sistemi', iconURL: botUser.displayAvatarURL() })
        .setFooter({ text: 'GraveOS • Ultra Gelişmiş Güvenlik Modülü', iconURL: message.guild.iconURL() })
        .setTimestamp();

    // --- KAPATMA İŞLEMİ (FULL EMBED) ---
    if (args[0] === 'kapat') {
        await GuildSettings.findOneAndUpdate({ guildId }, { otorol: null, otorolLog: null });
        const closeEmbed = createBaseEmbed()
            .setColor('#FF4B4B')
            .setTitle('🗑️ Sistem Devre Dışı')
            .setDescription('Otorol sistemi ve bağlı log kanalı başarıyla sıfırlandı. Yeni üyelere otomatik rol verilmeyecek.');
        return message.channel.send({ embeds: [closeEmbed] });
    }

    // --- SİHİRBAZ VERİLERİ ---
    let selection = { roleId: null, channelId: null };

    // --- ANA DASHBOARD ---
    const settings = await GuildSettings.findOne({ guildId });
    const dashboardEmbed = createBaseEmbed()
        .setColor('#2F3136')
        .setTitle('📊 Otorol Mevcut Durum Raporu')
        .setDescription(
            `**──────────────────────────**\n` +
            `🛰️ **Motor:** \`Grave Otorol\`\n` +
            `📡 **Durum:** ${settings?.otorol ? '`AKTİF` ✅' : '`YAPILANDIRILMAMIŞ` ⚠️'}\n` +
            `**──────────────────────────**\n` +
            `🎭 **Hedef Rol:** ${settings?.otorol ? `<@&${settings.otorol}>` : '`Seçilmedi`'}\n` +
            `📂 **Log Kanalı:** ${settings?.otorolLog ? `<#${settings.otorolLog}>` : '`Seçilmedi`'}\n` +
            `**──────────────────────────**`
        );

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('start_wizard').setLabel('Sistemi Yapılandır').setStyle(ButtonStyle.Primary).setEmoji('🚀'),
        new ButtonBuilder().setCustomId('quick_close').setLabel('Sistemi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    const msg = await message.channel.send({ embeds: [dashboardEmbed], components: [mainRow] });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 180000 
    });

    collector.on('collect', async (i) => {
        
        // ADIM 1: ROL SEÇİMİ
        if (i.customId === 'start_wizard') {
            const roles = message.guild.roles.cache
                .filter(r => r.name !== "@everyone" && !r.managed && r.position < message.guild.members.me.roles.highest.position)
                .first(25);

            if (roles.length === 0) {
                const errEmbed = createBaseEmbed().setColor('Red').setDescription('❌ Seçilebilir uygun bir rol bulunamadı! Botun yetkisini kontrol edin.');
                return i.update({ embeds: [errEmbed], components: [] });
            }

            const roleMenu = new StringSelectMenuBuilder()
                .setCustomId('step_role')
                .setPlaceholder('🛡️ Atanacak rolü seçiniz...')
                .addOptions(roles.map(r => ({
                    label: r.name,
                    value: r.id,
                    description: `Mevcut Üye: ${r.members.size}`,
                    emoji: '👤'
                })));

            const roleEmbed = createBaseEmbed()
                .setColor('#5865F2')
                .setTitle('🎭 Adım 1: Rol Belirleme')
                .setDescription('Sunucuya yeni katılan kullanıcılara hangi rolün otomatik olarak tanımlanmasını istersiniz?\n\n*Not: Botun rolü, seçilen rolden yukarıda olmalıdır.*');

            await i.update({ embeds: [roleEmbed], components: [new ActionRowBuilder().addComponents(roleMenu)] });
        }

        // ADIM 2: KANAL SEÇİMİ
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

            const channelEmbed = createBaseEmbed()
                .setColor('#5865F2')
                .setTitle('📋 Adım 2: Log Kanalı Seçimi')
                .setDescription(`Seçilen Rol: <@&${selection.roleId}>\n\nŞimdi, otorol verildiğinde bilgilendirme mesajının hangi kanala gönderileceğini seçin.`);

            await i.update({ embeds: [channelEmbed], components: [new ActionRowBuilder().addComponents(channelMenu)] });
        }

        // ADIM 3: ÖZET VE ONAY
        if (i.customId === 'step_channel') {
            selection.channelId = i.values[0];

            const summaryEmbed = createBaseEmbed()
                .setColor('#FEE75C')
                .setTitle('📝 Yapılandırma Özeti')
                .setDescription(
                    'Aşağıdaki ayarlar veritabanına kaydedilmek üzere. Onaylıyor musunuz?\n\n' +
                    `✅ **Verilecek Rol:** <@&${selection.roleId}>\n` +
                    `📡 **Rapor Kanalı:** <#${selection.channelId}>\n\n` +
                    '*Kaydet butonuna bastığınızda sistem anında aktifleşecektir.*'
                );

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('final_save').setLabel('Ayarları Kaydet').setStyle(ButtonStyle.Success).setEmoji('💾'),
                new ButtonBuilder().setCustomId('start_wizard').setLabel('Geri Dön / Düzenle').setStyle(ButtonStyle.Secondary).setEmoji('🔄')
            );

            await i.update({ embeds: [summaryEmbed], components: [confirmRow] });
        }

        // FİNAL: KAYIT VE BAŞARI
        if (i.customId === 'final_save') {
            await GuildSettings.findOneAndUpdate(
                { guildId },
                { otorol: selection.roleId, otorolLog: selection.channelId },
                { upsert: true }
            );

            const successEmbed = createBaseEmbed()
                .setColor('#00FF7F')
                .setTitle('💎 Yapılandırma Başarıyla Mühürlendi')
                .setDescription('Otorol sistemi başarıyla güncellendi. Artık her giriş yapan kullanıcı otomatik olarak yetkilendirilecek.')
                .addFields(
                    { name: '✅ İşlem', value: 'Sistem Aktif', inline: true },
                    { name: '🛡️ Güvenlik', value: 'Apex-v3', inline: true }
                );

            await i.update({ embeds: [successEmbed], components: [] });
            collector.stop();
        }

        // SİSTEMİ KAPATMA (BUTONDAN)
        if (i.customId === 'quick_close') {
            await GuildSettings.findOneAndUpdate({ guildId }, { otorol: null, otorolLog: null });
            const disabledEmbed = createBaseEmbed().setColor('#FF4B4B').setDescription('🛑 **Otorol sistemi pasifleştirildi.**');
            await i.update({ embeds: [disabledEmbed], components: [] });
            collector.stop();
        }
    });

    collector.on('end', (c, reason) => {
        if (reason === 'time' && c.size === 0) {
            const timeoutEmbed = createBaseEmbed().setColor('#2F3136').setDescription('⌛ **Süre dolduğu için işlem sonlandırıldı.**');
            msg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
};

module.exports.conf = { aliases: ['otorol-ayarla'] };
module.exports.help = { name: 'otorol' };
