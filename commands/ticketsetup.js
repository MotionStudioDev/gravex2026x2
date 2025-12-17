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
            .setDescription('Yeniden kurmak istersen mevcut ayarlar silinecek.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reinstall_yes').setLabel('Yeniden Kur').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('reinstall_no').setLabel('İptal').setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.reply({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'Bu buton sana ait değil!', ephemeral: true });

            if (i.customId === 'reinstall_no') {
                await i.update({ embeds: [new EmbedBuilder().setColor('Grey').setDescription('❌ İşlem iptal edildi.')], components: [] });
            } else {
                await i.deferUpdate();
                await TicketSettings.deleteOne({ guildId: message.guildId });
                await startSelectWizard(i);
            }
            collector.stop();
        });

        return;
    }

    await startSelectWizard(message);
};

async function startSelectWizard(interactionOrMessage) {
    const isInteraction = !!interactionOrMessage.deferred;
    const reply = async (content) => isInteraction ? await interactionOrMessage.editReply(content) : await interactionOrMessage.reply(content);

    let categoryId = null;
    let staffRoleId = null;
    let logChannelId = null;

    // Adım 1: Kategori Seç
    const categories = interactionOrMessage.guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory)
        .map(c => ({ label: c.name, value: c.id }));

    if (categories.length === 0) {
        return reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Sunucuda hiç kategori bulunamadı!')] });
    }

    const categoryMenu = new StringSelectMenuBuilder()
        .setCustomId('select_category')
        .setPlaceholder('Talep kategorisini seç...')
        .addOptions(categories.slice(0, 25)); // Max 25

    const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wizard_cancel').setLabel('İptal').setStyle(ButtonStyle.Danger)
    );

    const step1 = await reply({
        embeds: [new EmbedBuilder()
            .setColor('Blurple')
            .setTitle('1️⃣ Talep Kategorisi Seç')
            .setDescription('Ticket\'ların açılacağı kategoriyi aşağıdan seç.')
        ],
        components: [new ActionRowBuilder().addComponents(categoryMenu), cancelRow]
    });

    const collector = step1.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== interactionOrMessage.author.id) return i.reply({ content: 'Bu menü sana ait değil!', ephemeral: true });

        if (i.customId === 'wizard_cancel') {
            await i.update({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Kurulum iptal edildi.')], components: [] });
            return collector.stop();
        }

        if (i.customId === 'select_category') {
            categoryId = i.values[0];
            await i.update({ embeds: [new EmbedBuilder().setColor('Green').setDescription(`✅ Kategori seçildi: <#${categoryId}>\nŞimdi yetkili rolü seç.`)] });

            // Adım 2: Rol Seç
            const roles = interactionOrMessage.guild.roles.cache
                .filter(r => r.name !== '@everyone' && r.position < interactionOrMessage.guild.members.me.roles.highest.position)
                .sort((a, b) => b.position - a.position)
                .map(r => ({ label: r.name, value: r.id }));

            const roleMenu = new StringSelectMenuBuilder()
                .setCustomId('select_role')
                .setPlaceholder('Yetkili rolü seç...')
                .addOptions(roles.slice(0, 25));

            await i.followUp({
                embeds: [new EmbedBuilder().setColor('Blurple').setTitle('2️⃣ Yetkili Rol Seç').setDescription('Ticket\'ları üstlenecek ve kapatacak rolü seç.')],
                components: [new ActionRowBuilder().addComponents(roleMenu), cancelRow],
                ephemeral: true
            });

            collector.resetTimer();
        } else if (i.customId === 'select_role') {
            staffRoleId = i.values[0];
            await i.update({ embeds: [new EmbedBuilder().setColor('Green').setDescription(`✅ Yetkili rol seçildi: <@&${staffRoleId}>\nŞimdi log kanalı seç (isteğe bağlı).`)] });

            // Adım 3: Log Kanalı (İsteğe bağlı)
            const textChannels = interactionOrMessage.guild.channels.cache
                .filter(c => c.type === ChannelType.GuildText)
                .map(c => ({ label: c.name, value: c.id }));

            const logMenu = new StringSelectMenuBuilder()
                .setCustomId('select_log')
                .setPlaceholder('Log kanalı seç (atlamak için "Yok" seç)')
                .addOptions([
                    { label: 'Log Kanalı Ayarlama', value: 'none', description: 'Log gönderme' },
                    ...textChannels.slice(0, 24)
                ]);

            await i.followUp({
                embeds: [new EmbedBuilder().setColor('Blurple').setTitle('3️⃣ Log Kanalı Seç').setDescription('Kapanan ticket logları buraya düşecek (isteğe bağlı).')],
                components: [new ActionRowBuilder().addComponents(logMenu), cancelRow],
                ephemeral: true
            });

            collector.resetTimer();
        } else if (i.customId === 'select_log') {
            if (i.values[0] !== 'none') logChannelId = i.values[0];

            // Özet ve Onay
            const summary = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Tüm Ayarlar Tamam!')
                .addFields(
                    { name: 'Kategori', value: `<#${categoryId}>` },
                    { name: 'Yetkili Rol', value: `<@&${staffRoleId}>` },
                    { name: 'Log Kanalı', value: logChannelId ? `<#${logChannelId}>` : 'Yok' }
                )
                .setFooter({ text: 'Onayla ve paneli oluştur!' });

            const finalRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('final_confirm').setLabel('Kur ve Panel Oluştur').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('final_cancel').setLabel('İptal').setStyle(ButtonStyle.Danger)
            );

            await i.update({ embeds: [summary], components: [finalRow] });
            collector.stop();
        } else if (i.customId === 'final_confirm') {
            await i.deferUpdate();

            const loading = await i.editReply({ embeds: [new EmbedBuilder().setColor('Yellow').setDescription('⏳ Panel oluşturuluyor...')], components: [] });

            const panelEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('🎫 Destek Sistemi')
                .setDescription('Destek talebi oluşturmak için aşağıdaki butona tıklayın.\n\n**Kurallar:**\n• Gereksiz bilet açmak yasaktır\n• Yetkilileri gereksiz etiketlemeyin')
                .setFooter({ text: 'Grave Ticket Sistemi' });

            const panelRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_ticket_modal').setLabel('Bilet Aç').setEmoji('🎫').setStyle(ButtonStyle.Primary)
            );

            await loading.edit({ embeds: [panelEmbed], components: [panelRow] });

            await TicketSettings.create({
                guildId: interactionOrMessage.guildId,
                categoryId,
                staffRoleId,
                logChannelId: logChannelId || null,
                messageId: loading.id,
                channelId: loading.channel.id
            });

            await i.followUp({ embeds: [new EmbedBuilder().setColor('Green').setDescription('✅ **Bilet sistemi başarıyla kuruldu!**')], ephemeral: true });
        } else if (i.customId === 'final_cancel') {
            await i.update({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Kurulum iptal edildi.')], components: [] });
        }
    });
}

module.exports.conf = { aliases: ['ticket-kur', 'ticket-setup'] };
module.exports.help = { name: 'ticket-sistemi' };
