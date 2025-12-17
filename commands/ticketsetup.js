const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionsBitField,
    ChannelType
} = require('discord.js');
const TicketSettings = require('../models/TicketSettings');

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.');
    }

    const existing = await TicketSettings.findOne({ guildId: message.guildId });

    if (existing) {
        const embed = new EmbedBuilder()
            .setColor('Orange')
            .setTitle('⚠️ Bilet Sistemi Zaten Kurulu')
            .setDescription('Mevcut ayarları silip yeniden kurmak istiyor musun?');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reinstall_yes').setLabel('Evet, Yeniden Kur').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('reinstall_no').setLabel('Hayır').setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.reply({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'Bu buton sana ait değil!', ephemeral: true });

            if (i.customId === 'reinstall_no') {
                await i.update({ embeds: [new EmbedBuilder().setColor('Grey').setDescription('❌ Yeniden kurulum iptal edildi.')], components: [] });
            } else {
                await i.update({ embeds: [new EmbedBuilder().setColor('Yellow').setDescription('⏳ Yeniden kurulum başlatılıyor...')], components: [] });
                await TicketSettings.deleteOne({ guildId: message.guildId });
                await startWizard(i);
            }
            collector.stop();
        });

        return;
    }

    await startWizard(message);
};

async function startWizard(trigger) {
    // trigger: message veya interaction
    const guild = trigger.guild;
    const authorId = trigger.author ? trigger.author.id : trigger.user.id;

    let step = 'category'; // category -> role -> log -> confirm
    let categoryId = null;
    let staffRoleId = null;
    let logChannelId = null;

    const sendStep = async () => {
        if (step === 'category') {
            const categories = guild.channels.cache
                .filter(c => c.type === ChannelType.GuildCategory)
                .map(c => ({ label: c.name.slice(0, 25), value: c.id, description: 'Kategori' }));

            if (categories.length === 0) {
                return trigger.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Sunucuda kategori bulunamadı!')] });
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId('setup_category')
                .setPlaceholder('Bir kategori seç...')
                .addOptions(categories.slice(0, 25));

            const row = new ActionRowBuilder().addComponents(menu);
            const cancelRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('setup_cancel').setLabel('İptal').setStyle(ButtonStyle.Danger)
            );

            await trigger.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('Blurple')
                    .setTitle('🎫 Bilet Sistemi Kurulum - Adım 1/3')
                    .setDescription('**Talep kategorisini seçin** (ticket\'lar bu kategoride açılacak)')
                ],
                components: [row, cancelRow]
            });
        }

        if (step === 'role') {
            const roles = guild.roles.cache
                .filter(r => r.name !== '@everyone' && r.id !== guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => ({ label: r.name.slice(0, 25), value: r.id }));

            const menu = new StringSelectMenuBuilder()
                .setCustomId('setup_role')
                .setPlaceholder('Yetkili rolü seç...')
                .addOptions(roles.slice(0, 25));

            const row = new ActionRowBuilder().addComponents(menu);
            const cancelRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('setup_cancel').setLabel('İptal').setStyle(ButtonStyle.Danger)
            );

            await trigger.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('Blurple')
                    .setTitle('🎫 Bilet Sistemi Kurulum - Adım 2/3')
                    .setDescription('**Yetkili rolü seçin** (üstlenecek ve kapatacak rol)')
                ],
                components: [row, cancelRow]
            });
        }

        if (step === 'log') {
            const channels = guild.channels.cache
                .filter(c => c.type === ChannelType.GuildText)
                .map(c => ({ label: c.name.slice(0, 25), value: c.id }));

            const menu = new StringSelectMenuBuilder()
                .setCustomId('setup_log')
                .setPlaceholder('Log kanalı seç (isteğe bağlı)')
                .addOptions([
                    { label: 'Log Kanalı Ayarlama', value: 'none', description: 'Log gönderme' },
                    ...channels.slice(0, 24)
                ]);

            const row = new ActionRowBuilder().addComponents(menu);
            const cancelRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('setup_cancel').setLabel('İptal').setStyle(ButtonStyle.Danger)
            );

            await trigger.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('Blurple')
                    .setTitle('🎫 Bilet Sistemi Kurulum - Adım 3/3')
                    .setDescription('**Log kanalı seçin** (kapanan ticketler buraya düşecek - isteğe bağlı)')
                ],
                components: [row, cancelRow]
            });
        }

        if (step === 'confirm') {
            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Kurulum Özeti')
                .setDescription('Ayarlar hazır! Onaylıyor musun?')
                .addFields(
                    { name: 'Kategori', value: `<#${categoryId}>`, inline: true },
                    { name: 'Yetkili Rol', value: `<@&${staffRoleId}>`, inline: true },
                    { name: 'Log Kanalı', value: logChannelId ? `<#${logChannelId}>` : 'Yok', inline: true }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('setup_confirm').setLabel('Onayla ve Kur').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('setup_cancel').setLabel('İptal').setStyle(ButtonStyle.Danger)
            );

            await trigger.channel.send({ embeds: [embed], components: [row] });
        }
    };

    await sendStep();

    const collector = trigger.channel.createMessageComponentCollector({
        filter: i => i.user.id === authorId,
        time: 300000
    });

    collector.on('collect', async i => {
        if (i.customId === 'setup_cancel') {
            await i.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Kurulum iptal edildi.')], ephemeral: true });
            return collector.stop();
        }

        if (i.customId === 'setup_category') {
            categoryId = i.values[0];
            await i.reply({ content: `✅ Kategori seçildi: <#${categoryId}>`, ephemeral: true });
            step = 'role';
            await sendStep();
        }

        if (i.customId === 'setup_role') {
            staffRoleId = i.values[0];
            await i.reply({ content: `✅ Yetkili rol seçildi: <@&${staffRoleId}>`, ephemeral: true });
            step = 'log';
            await sendStep();
        }

        if (i.customId === 'setup_log') {
            if (i.values[0] !== 'none') logChannelId = i.values[0];
            await i.reply({ content: `✅ Log kanalı: ${logChannelId ? `<#${logChannelId}>` : 'Ayarlanmadı'}`, ephemeral: true });
            step = 'confirm';
            await sendStep();
        }

        if (i.customId === 'setup_confirm') {
            await i.deferUpdate();

            const loadingMsg = await i.channel.send({ embeds: [new EmbedBuilder().setColor('Yellow').setDescription('⏳ Panel oluşturuluyor...')] });

            const panelEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('🎫 Destek Sistemi')
                .setDescription('Destek talebi oluşturmak için aşağıdaki butona tıklayın.\n\n**Kurallar:**\n• Gereksiz bilet açmak yasaktır\n• Yetkilileri gereksiz etiketlemeyin')
                .setFooter({ text: 'Grave Ticket Sistemi' });

            const panelRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_ticket_modal').setLabel('Bilet Aç').setEmoji('🎫').setStyle(ButtonStyle.Primary)
            );

            await loadingMsg.edit({ embeds: [panelEmbed], components: [panelRow] });

            await TicketSettings.create({
                guildId: guild.id,
                categoryId,
                staffRoleId,
                logChannelId: logChannelId || null,
                messageId: loadingMsg.id,
                channelId: loadingMsg.channel.id
            });

            await i.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setDescription('✅ **Bilet sistemi başarıyla kuruldu!**')] });
            collector.stop();
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0 || !collected.last()?.deferred) {
            // Süre doldu
            trigger.channel.send({ embeds: [new EmbedBuilder().setColor('Orange').setDescription('⏰ Kurulum süresi doldu, iptal edildi.')]}).catch(() => {});
        }
    });
}

module.exports.conf = { aliases: ['ticket-kur', 'ticket-setup'] };
module.exports.help = { name: 'ticket-sistemi' };
