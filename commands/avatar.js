const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message, args) => {
    const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
    const member = message.guild.members.cache.get(target.id);

    // Avatar ve banner URL'leri
    const getAvatar = (size = 1024, format = 'png', server = false) => {
        if (server && member?.avatar) {
            return member.displayAvatarURL({ size, format, dynamic: true });
        }
        return target.displayAvatarURL({ size, format, dynamic: true });
    };

    const banner = target.bannerURL({ size: 1024, dynamic: true });

    // Nitro kontrolü
    const hasNitro = target.banner || target.displayAvatarURL().endsWith('.gif') || target.flags?.toArray().some(f => f.includes('Premium'));

    let current = {
        category: member?.avatar ? 'server' : 'global',
        size: 1024,
        format: 'png'
    };

    const createEmbed = () => {
        const isServer = current.category === 'server';
        const isBanner = current.category === 'banner';
        const url = isBanner ? banner : getAvatar(current.size, current.format, isServer);

        const title = isBanner ? '🎨 Banner' : isServer ? '🏠 Sunucu Avatarı' : '🌐 Genel Avatar';
        const desc = isBanner ? 'Kullanıcının profil bannerı (Nitro gerektirir)' :
                     isServer ? 'Bu sunucudaki özel avatar' : 'Discord genelindeki avatar';

        return new EmbedBuilder()
            .setColor('Blurple')
            .setTitle(`${title} | ${target.username}`)
            .setDescription(desc)
            .setImage(url)
            .addFields(
                { name: 'Bilgiler', value: [
                    `**Boyut:** ${current.size}x${current.size}`,
                    `**Format:** ${current.format.toUpperCase()}`,
                    `**Nitro:** ${hasNitro ? '✅ Var' : '❌ Yok'}`,
                    `**ID:** \`${target.id}\``
                ].join('\n'), inline: true }
            )
            .setFooter({ text: `g!avatar • ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    };

    // Kategori menüsü
    const categoryMenu = new StringSelectMenuBuilder()
        .setCustomId('category')
        .setPlaceholder('Kategori seç...')
        .addOptions([
            { label: 'Genel Avatar', value: 'global', emoji: '🌐' },
            ...(member?.avatar ? [{ label: 'Sunucu Avatarı', value: 'server', emoji: '🏠' }] : []),
            ...(banner ? [{ label: 'Banner', value: 'banner', emoji: '🎨' }] : [])
        ]);

    // Boyut menüsü
    const sizeMenu = new StringSelectMenuBuilder()
        .setCustomId('size')
        .setPlaceholder('Boyut seç...')
        .addOptions([
            { label: '128x128', value: '128' },
            { label: '256x256', value: '256' },
            { label: '512x512', value: '512' },
            { label: '1024x1024', value: '1024' },
            { label: '2048x2048', value: '2048' },
            { label: '4096x4096', value: '4096', emoji: '🔥' }
        ]);

    // Format menüsü
    const formatMenu = new StringSelectMenuBuilder()
        .setCustomId('format')
        .setPlaceholder('Format seç...')
        .addOptions([
            { label: 'PNG', value: 'png', emoji: '🖼️' },
            { label: 'JPG', value: 'jpg' },
            { label: 'WEBP', value: 'webp' },
            ...(target.displayAvatarURL().endsWith('.gif') ? [{ label: 'GIF', value: 'gif', emoji: '🎞️' }] : [])
        ]);

    // Butonlar
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('PNG İndir').setStyle(ButtonStyle.Link).setURL(getAvatar(current.size, 'png', current.category === 'server')),
        new ButtonBuilder().setLabel('JPG İndir').setStyle(ButtonStyle.Link).setURL(getAvatar(current.size, 'jpg', current.category === 'server')),
        new ButtonBuilder().setLabel('Tam Boy Gör').setStyle(ButtonStyle.Primary).setCustomId('full'),
        new ButtonBuilder().setLabel('Kapat').setStyle(ButtonStyle.Danger).setCustomId('close')
    );

    const rows = [
        new ActionRowBuilder().addComponents(categoryMenu),
        new ActionRowBuilder().addComponents(sizeMenu),
        new ActionRowBuilder().addComponents(formatMenu),
        buttons
    ];

    const msg = await message.channel.send({ embeds: [createEmbed()], components: rows });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 120000
    });

    collector.on('collect', async i => {
        if (i.customId === 'close') {
            await i.update({ components: [] });
            collector.stop();
            return;
        }

        if (i.customId === 'full') {
            const fullUrl = current.category === 'banner' ? banner : getAvatar(4096, current.format, current.category === 'server');
            await i.reply({ content: `🔍 **Tam Boy:** ${fullUrl}`, ephemeral: true });
            return;
        }

        if (i.customId === 'category') {
            current.category = i.values[0];
        } else if (i.customId === 'size') {
            current.size = parseInt(i.values[0]);
        } else if (i.customId === 'format') {
            current.format = i.values[0];
        }

        // Buton linklerini güncelle
        const updatedButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('PNG İndir').setStyle(ButtonStyle.Link).setURL(getAvatar(current.size, 'png', current.category === 'server')),
            new ButtonBuilder().setLabel('JPG İndir').setStyle(ButtonStyle.Link).setURL(getAvatar(current.size, 'jpg', current.category === 'server')),
            new ButtonBuilder().setLabel('Tam Boy Gör').setStyle(ButtonStyle.Primary).setCustomId('full'),
            new ButtonBuilder().setLabel('Kapat').setStyle(ButtonStyle.Danger).setCustomId('close')
        );

        await i.update({
            embeds: [createEmbed()],
            components: [
                new ActionRowBuilder().addComponents(categoryMenu.setOptions(categoryMenu.options.map(opt => opt.setDefault(opt.data.value === current.category)))),
                new ActionRowBuilder().addComponents(sizeMenu.setOptions(sizeMenu.options.map(opt => opt.setDefault(opt.data.value == current.size)))),
                new ActionRowBuilder().addComponents(formatMenu.setOptions(formatMenu.options.map(opt => opt.setDefault(opt.data.value === current.format)))),
                updatedButtons
            ]
        });
    });

    collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = {
    aliases: ['pp', 'profil', 'foto', 'av', 'avatar']
};

module.exports.help = {
    name: 'avatar',
    description: 'Gelişmiş avatar görüntüleme sistemi (kategori, boyut, format seçimi, banner desteği)'
};
