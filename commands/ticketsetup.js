const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const TicketSettings = require('../models/TicketSettings');

module.exports.run = async (client, message, args) => {
    const startEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🎫 Grave Ticket Sistemi Kurulumu')
        .setDescription('Sistemi kurmak için aşağıdaki adımları izleyin.');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('approve_setup').setLabel('Sistemi Aktif Et').setStyle(ButtonStyle.Success)
    );

    const msg = await message.channel.send({ embeds: [startEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });

    let data = { guildId: message.guild.id };

    collector.on('collect', async i => {
        if (i.customId === 'approve_setup') {
            const channelSelect = new StringSelectMenuBuilder()
                .setCustomId('select_channel')
                .setPlaceholder('Ticket mesajının atılacağı kanalı seçin...')
                .addOptions(message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).first(25).map(c => ({ label: c.name, value: c.id })));
            
            await i.update({ content: '📍 **Adım 1:** Kanal seçin.', embeds: [], components: [new ActionRowBuilder().addComponents(channelSelect)] });
        }

        if (i.customId === 'select_channel') {
            data.setupChannel = i.values[0];
            const roleSelect = new StringSelectMenuBuilder()
                .setCustomId('select_role')
                .setPlaceholder('Biletlere bakacak yetkili rolü seçin...')
                .addOptions(message.guild.roles.cache.filter(r => !r.managed && r.name !== '@everyone').first(25).map(r => ({ label: r.name, value: r.id })));

            await i.update({ content: '👮 **Adım 2:** Yetkili rolü seçin.', components: [new ActionRowBuilder().addComponents(roleSelect)] });
        }

        if (i.customId === 'select_role') {
            data.staffRoleId = i.values[0];
            await i.deferUpdate();

            // Kategori Oluştur
            let category = message.guild.channels.cache.find(c => c.name === "Grave Ticket's" && c.type === ChannelType.GuildCategory);
            if (!category) {
                category = await message.guild.channels.create({
                    name: "Grave Ticket's",
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [{ id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] }]
                });
            }
            data.categoryId = category.id;

            // Veritabanına Kaydet
            await TicketSettings.findOneAndUpdate({ guildId: data.guildId }, data, { upsert: true });

            // Ana Mesajı Gönder
            const setupChannel = client.channels.cache.get(data.setupChannel);
            const ticketEmbed = new EmbedBuilder()
                .setColor('Blurple')
                .setTitle('📩 Destek Talebi Oluştur')
                .setDescription('Aşağıdaki butona basarak destek ekibiyle iletişime geçebilirsiniz.')
                .setFooter({ text: 'Grave Ticket Sistemi' });

            const btn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_ticket').setLabel('Ticket Aç').setEmoji('🎫').setStyle(ButtonStyle.Primary)
            );

            await setupChannel.send({ embeds: [ticketEmbed], components: [btn] });
            await msg.edit({ content: '✅ **Kurulum Başarılı!** Kategori oluşturuldu ve ayarlar kaydedildi.', components: [] });
            collector.stop();
        }
    });
};

module.exports.conf = { aliases: ['ts'] };
module.exports.help = { name: 'ticket-sistemi' };
