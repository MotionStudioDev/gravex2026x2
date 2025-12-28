const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, AuditLogEvent } = require('discord.js');
const axios = require('axios');
const AdmZip = require('adm-zip');
const moment = require('moment');
moment.locale('tr');

module.exports.run = async (client, message, args) => {
    const canManage = message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
    const canViewAudit = message.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog);

    const fetchAll = () => message.guild.emojis.cache.map(e => ({
        gösterim: `${e}`,
        id: e.id,
        url: e.imageURL({ extension: e.animated ? 'gif' : 'png', size: 1024 }),
        name: e.name,
        animated: e.animated,
        createdTimestamp: e.createdTimestamp,
        fullCode: `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`
    }));

    let allEmojis = fetchAll();
    
    if (allEmojis.length === 0) {
        const noEmojiEmbed = new EmbedBuilder()
            .setColor('Red')
            .setDescription('❌ **Sunucuda herhangi bir özel emoji bulunamadı!**');
        return message.channel.send({ embeds: [noEmojiEmbed] });
    }

    let currentFilter = 'ALL';
    let page = 0;
    let viewMode = 'VISUAL'; 
    let filteredEmojis = allEmojis;

    const getEmojiAuthor = async (emojiId) => {
        if (!canViewAudit) return "Yetki Yok (Denetim Kaydı)";
        try {
            const audits = await message.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiCreate, limit: 50 });
            const entry = audits.entries.find(e => e.targetId === emojiId);
            return entry ? `${entry.executor.tag}` : "Bulunamadı (Eski)";
        } catch { return "Hata Oluştu"; }
    };

    const buildEmbed = async (index, list) => {
        const tier = message.guild.premiumTier;
        const max = tier === 3 ? 250 : (tier === 2 ? 150 : (tier === 1 ? 100 : 50));
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${message.guild.name} Emoji Denetimi`, iconURL: message.guild.iconURL() })
            .setFooter({ text: `Talep eden: ${message.author.username} • Toplam: ${list.length}` });

        if (viewMode === 'VISUAL') {
            const emoji = list[index];
            const author = await getEmojiAuthor(emoji.id);
            
            embed.setColor(emoji?.animated ? '#FFCC00' : '#0099FF')
                 .setTitle(`<:pic:1454767560359674021> Görsel Görünüm (${index + 1}/${list.length})`)
                 .setImage(emoji?.url || null)
                 .addFields(
                    { name: 'Emoji Bilgisi', value: `${emoji?.gösterim} \`${emoji?.name}\``, inline: true },
                    { name: 'Ekleyen Kişi', value: `\`${author}\``, inline: true },
                    { name: 'Eklenme Tarihi', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Emoji ID', value: `\`${emoji?.id}\``, inline: true },
                    { name: 'Kapasite', value: ` ${allEmojis.length} / ${max * 2}`, inline: true }
                 );
        } else {
            const start = index;
            const pageEmojis = list.slice(start, start + 10);
            const listDescription = pageEmojis.map((e, i) => `**${start + i + 1}.** ${e.gösterim} \`→\` \`${e.fullCode}\``).join('\n');
            
            embed.setColor('#2F3136')
                 .setTitle(`<:ID:1416530654006349967> ID Liste Görünümü (${start + 1}-${Math.min(start + 10, list.length)})`)
                 .setDescription(`**Tarih Aralığı:** <t:${Math.floor(list[0].createdTimestamp / 1000)}:d> - <t:${Math.floor(list[list.length-1].createdTimestamp / 1000)}:d>\n\n${listDescription || "Bu sayfada emoji yok."}`);
        }
        return embed;
    };

    const buildComponents = (index, list, disabled = false) => {
        const menuRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('emoji_manage_menu')
                .setPlaceholder('Emoji İşlemleri...')
                .setDisabled(disabled)
                .addOptions([
                    { label: 'Filtre: Tümü', value: 'f_all', emoji: '<:box:1454769953906364479>' },
                    { label: 'Filtre: Resimli', value: 'f_static', emoji: '<:pic:1454767560359674021>' },
                    { label: 'Filtre: Animasyonlu', value: 'f_anim', emoji: '<a:gifs:1454769272365645925>' },
                    { label: 'Emoji İsimlendir', value: 'edit_name', emoji: '<:kalem:1454765090963329168>' },
                    { label: 'Emojiyi Sil', value: 'delete_emoji', emoji: '<:trash:1454766061202309142>' },
                    { label: 'Emojileri WinRAR ile Sıkıştır', value: 'zip_all', emoji: '<:winrar:1454762951578877964>' }
                ])
        );

        const step = viewMode === 'VISUAL' ? 1 : 10;
        const navRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setEmoji('<:left:1454771071411552381>').setStyle(ButtonStyle.Secondary).setDisabled(disabled || index === 0),
            new ButtonBuilder().setCustomId('toggle_view').setLabel(viewMode === 'VISUAL' ? 'ID İle Gör' : 'Görsel Gör').setEmoji(viewMode === 'VISUAL' ? '<:ID:1416530654006349967>' : '<:pic:1454767560359674021>').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId('search').setEmoji('<:search:1454768274720952444>').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId('next').setEmoji('<:right:1454771000993648660>').setStyle(ButtonStyle.Secondary).setDisabled(disabled || index + step >= list.length)
        );
        return [menuRow, navRow];
    };

    const msg = await message.channel.send({
        embeds: [await buildEmbed(page, filteredEmojis)],
        components: buildComponents(page, filteredEmojis)
    });

    const collector = msg.createMessageComponentCollector({ time: 600000 });

    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
            return i.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ **Bu paneli sadece komutu başlatan kişi kullanabilir!**')], ephemeral: true });
        }

        const step = viewMode === 'VISUAL' ? 1 : 10;

        if (i.isStringSelectMenu()) {
            const val = i.values[0];
            if (val.startsWith('f_')) {
                currentFilter = val.split('_')[1].toUpperCase();
                filteredEmojis = currentFilter === 'STATIC' ? allEmojis.filter(e => !e.animated) : (currentFilter === 'ANIMATED' ? allEmojis.filter(e => e.animated) : allEmojis);
                page = 0;
            } else if (val === 'edit_name' && canManage) {
                const modal = new ModalBuilder().setCustomId('edit_modal').setTitle('İsim Değiştir');
                const input = new TextInputBuilder().setCustomId('new_name').setLabel('Yeni İsim').setStyle(TextInputStyle.Short).setValue(filteredEmojis[page].name);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return i.showModal(modal);
            } else if (val === 'delete_emoji' && canManage) {
                await message.guild.emojis.delete(filteredEmojis[page].id);
                allEmojis = fetchAll(); filteredEmojis = allEmojis; page = 0;
                return i.update({ embeds: [await buildEmbed(page, filteredEmojis)], components: buildComponents(page, filteredEmojis) });
            } else if (val === 'zip_all') {
                const zipLoading = new EmbedBuilder().setColor('Yellow').setDescription('⏳ **Paketleniyor, lütfen bekleyin...**');
                await i.reply({ embeds: [zipLoading], ephemeral: true });
                const zip = new AdmZip();
                for (const e of filteredEmojis) {
                    const res = await axios.get(e.url, { responseType: 'arraybuffer' }).catch(() => null);
                    if (res) zip.addFile(`${e.name}.${e.animated ? 'gif' : 'png'}`, Buffer.from(res.data));
                }
                const zipComplete = new EmbedBuilder().setColor('Green').setDescription('✅ **Paketleme tamamlandı!**');
                return i.editReply({ embeds: [zipComplete], files: [new AttachmentBuilder(zip.toBuffer(), { name: 'emojiler.zip' })] });
            }
        }

        if (i.isButton()) {
            if (i.customId === 'prev') page = Math.max(0, page - step);
            if (i.customId === 'next') page = Math.min(filteredEmojis.length - 1, page + step);
            if (i.customId === 'toggle_view') { viewMode = viewMode === 'VISUAL' ? 'ID_LIST' : 'VISUAL'; page = 0; }
            if (i.customId === 'search') {
                const modal = new ModalBuilder().setCustomId('search_modal').setTitle('Emoji Ara');
                const input = new TextInputBuilder().setCustomId('search_query').setLabel('Emoji Adı').setStyle(TextInputStyle.Short);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return i.showModal(modal);
            }
        }
        await i.update({ embeds: [await buildEmbed(page, filteredEmojis)], components: buildComponents(page, filteredEmojis) });
    });

    // --- SÜRE BİTİMİ (TIMEOUT) KONTROLÜ ---
    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('⌛ Süre Doldu')
                .setDescription('Bu emojiler panelinin kullanım süresi (10 dakika) dolmuştur. İşlemlere devam etmek için komutu tekrar kullanın.');

            await msg.edit({ 
                embeds: [timeoutEmbed], 
                components: buildComponents(page, filteredEmojis, true) // Butonları kapatır
            }).catch(() => {});
        }
    });

    client.on('interactionCreate', async m => {
        if (!m.isModalSubmit()) return;
        if (m.customId === 'search_modal') {
            const query = m.fields.getTextInputValue('search_query').toLowerCase();
            filteredEmojis = allEmojis.filter(e => e.name.toLowerCase().includes(query));
            page = 0;
            await m.update({ embeds: [await buildEmbed(page, filteredEmojis)], components: buildComponents(page, filteredEmojis) });
        }
        if (m.customId === 'edit_modal') {
            const newName = m.fields.getTextInputValue('new_name');
            await message.guild.emojis.edit(filteredEmojis[page].id, { name: newName });
            allEmojis = fetchAll();
            const editSuccess = new EmbedBuilder().setColor('Green').setDescription(`✅ **Emoji adı başarıyla \`${newName}\` olarak değiştirildi!**`);
            await m.reply({ embeds: [editSuccess], ephemeral: true });
        }
    });
};

module.exports.conf = { aliases: ['emojiler', 'eyon'] };
module.exports.help = { name: 'emojiler' };
