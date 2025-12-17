const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits, 
    StringSelectMenuBuilder,
    ComponentType 
} = require('discord.js');

module.exports.run = async (client, message, args) => {
    // 1. ADIM: Onay Mesajı
    const startEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🎫 Ticket Sistemi Kurulumu')
        .setDescription('Ticket sistemini bu sunucuda aktif etmek istiyor musunuz?\n\n*Onay verirseniz kurulum adımları başlayacaktır.*');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('approve_setup').setLabel('Onay Ver').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel_setup').setLabel('İptal Et').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [startEmbed], components: [row] });

    // Kolektör Değişkenleri
    let targetChannel;
    let targetRole;

    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        // --- ONAY AŞAMASI ---
        if (i.customId === 'approve_setup') {
            const channelEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('Sistem Aktif Edildi!')
                .setDescription('Lütfen ticket açma mesajının gönderileceği **Kanalı Seçin**.');

            const channelSelect = new StringSelectMenuBuilder()
                .setCustomId('select_channel')
                .setPlaceholder('Bir kanal seçin...')
                .addOptions(
                    message.guild.channels.cache
                        .filter(c => c.type === ChannelType.GuildText)
                        .first(25)
                        .map(c => ({ label: c.name, value: c.id }))
                );

            await i.update({ embeds: [channelEmbed], components: [new ActionRowBuilder().addComponents(channelSelect)] });
        }

        // --- KANAL SEÇİMİ ---
        if (i.customId === 'select_channel') {
            targetChannel = i.values[0];
            const roleEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('Ticket Kanalı Onaylandı!')
                .setDescription('Şimdi biletlere bakacak **Yetkili Rolü** seçin.');

            const roleSelect = new StringSelectMenuBuilder()
                .setCustomId('select_role')
                .setPlaceholder('Bir rol seçin...')
                .addOptions(
                    message.guild.roles.cache
                        .filter(r => r.name !== '@everyone' && !r.managed)
                        .first(25)
                        .map(r => ({ label: r.name, value: r.id }))
                );

            await i.update({ embeds: [roleEmbed], components: [new ActionRowBuilder().addComponents(roleSelect)] });
        }

        // --- ROL SEÇİMİ VE FİNAL ---
        if (i.customId === 'select_role') {
            targetRole = i.values[0];
            await i.deferUpdate();

            // 1. Kategori Oluştur (Grave Ticket's)
            let category = message.guild.channels.cache.find(c => c.name === "Grave Ticket's" && c.type === ChannelType.GuildCategory);
            if (!category) {
                category = await message.guild.channels.create({
                    name: "Grave Ticket's",
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] }
                    ]
                });
            }

            // 2. Belirlenen Kanala Ticket Mesajını At
            const setupChannel = client.channels.cache.get(targetChannel);
            const ticketOpenEmbed = new EmbedBuilder()
                .setColor('Blurple')
                .setTitle('📩 Destek Talebi Oluştur')
                .setDescription('Bir sorununuz mu var? Aşağıdaki butona basarak destek ekibimizle iletişime geçebilirsiniz.')
                .setFooter({ text: 'Grave Ticket Sistemi' });

            const ticketButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_ticket').setLabel('Ticket Aç').setEmoji('🎫').setStyle(ButtonStyle.Primary)
            );

            await setupChannel.send({ embeds: [ticketOpenEmbed], components: [ticketButton] });

            // 3. Kurulum Yapan Kişiye Onay Ver
            const finalEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Kurulum Tamamlandı!')
                .setDescription(`Sistem başarıyla kuruldu.\n\n**Kanal:** <#${targetChannel}>\n**Yetkili Rolü:** <@&${targetRole}>\n**Kategori:** ${category.name}`);

            await msg.edit({ embeds: [finalEmbed], components: [] });
            collector.stop();

            // ÖNEMLİ: Bu verileri bir database'e kaydetmen gerekir (targetRole ve category.id için). 
            // Şimdilik global bir değişkene veya basit bir nesneye atabilirsin.
            client.ticketConfig = { role: targetRole, category: category.id };
        }

        if (i.customId === 'cancel_setup') {
            await i.update({ content: '❌ İşlem iptal edildi.', embeds: [], components: [] });
            collector.stop();
        }
    });
};

module.exports.conf = { aliases: ['ticket-kur', 'ts'] };
module.exports.help = { name: 'ticket-sistemi' };
