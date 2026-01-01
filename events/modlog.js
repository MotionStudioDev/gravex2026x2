const { EmbedBuilder, AuditLogEvent, ChannelType, PermissionsBitField } = require('discord.js');
const ModLog = require('../models/modlog');

module.exports = (client) => {
    // Güvenli executor bulucu
    const getExecutor = async (guild, type, targetId) => {
        if (!guild.members.me?.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return null;

        try {
            const fetchedLogs = await guild.fetchAuditLogs({ limit: 5, type });
            const log = fetchedLogs.entries.find(e => e.target?.id === targetId && e.createdTimestamp > Date.now() - 15000);
            return log?.executor || null;
        } catch (err) {
            console.error('Audit log hatası:', err);
            return null;
        }
    };

    // Executor author fallback
    const safeExecutorAuthor = (executor) => ({
        name: executor?.tag || 'Otomatik / Bilinmeyen Yetkili',
        iconURL: executor?.displayAvatarURL({ dynamic: true, size: 4096 }) || null
    });

    // Ortak footer
    const footer = { text: `ModLog • ${client.user.username}`, iconURL: client.user.displayAvatarURL({ dynamic: true, size: 4096 }) };

    // ----------------------------------------------------------------------
    // 1. MESAJ OLAYLARI
    // ----------------------------------------------------------------------
    client.on('messageDelete', async (message) => {
        if (!message.guild || message.author?.bot || !message.author) return;

        const data = await ModLog.findOne({ guildID: message.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = message.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete, message.author.id);

        let content = message.content || '*İçerik yok (embed/görsel/sticker vs.)*';
        if (content.length > 1000) content = content.substring(0, 1000) + '...';

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🗑️ Mesaj Silindi')
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true, size: 4096 }) })
            .setDescription(content ? `\`\`\`${content}\`\`\`` : '*Tamamen boş*')
            .addFields(
                { name: '👤 Yazar', value: `${message.author}`, inline: true },
                { name: '🛠️ Silen', value: executor ? `${executor}` : 'Kendisi veya bilinmiyor', inline: true },
                { name: '📍 Kanal', value: `${message.channel}`, inline: true },
                { name: '🆔 Mesaj ID', value: `\`${message.id}\``, inline: true },
                { name: '📎 Ekler', value: message.attachments.size ? `${message.attachments.size} adet` : 'Yok', inline: true },
                { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (!oldMessage.guild || oldMessage.author?.bot || oldMessage.content === newMessage.content || !oldMessage.author) return;

        const data = await ModLog.findOne({ guildID: oldMessage.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = oldMessage.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        let oldC = oldMessage.content || '*Boş*';
        let newC = newMessage.content || '*Boş*';
        if (oldC.length > 500) oldC = oldC.substring(0, 500) + '...';
        if (newC.length > 500) newC = newC.substring(0, 500) + '...';

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('✏️ Mesaj Düzenlendi')
            .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL({ dynamic: true, size: 4096 }) })
            .addFields(
                { name: '👤 Kullanıcı', value: `${oldMessage.author}`, inline: true },
                { name: '📍 Kanal', value: `${oldMessage.channel}`, inline: true },
                { name: '🔗 Link', value: `[Tıkla](${newMessage.url})`, inline: true },
                { name: '🆔 Mesaj ID', value: `\`${oldMessage.id}\``, inline: true },
                { name: '⬅️ Eski', value: `\`\`\`${oldC}\`\`\``, inline: false },
                { name: '➡️ Yeni', value: `\`\`\`${newC}\`\`\``, inline: false }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('messageDeleteBulk', async (messages) => {
        const firstMsg = messages.first();
        if (!firstMsg?.guild) return;

        const data = await ModLog.findOne({ guildID: firstMsg.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = firstMsg.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#FF5500')
            .setTitle('🧹 Toplu Mesaj Silindi')
            .setDescription(`**${firstMsg.channel}** kanalında **${messages.size}** mesaj temizlendi.`)
            .addFields(
                { name: '📍 Kanal', value: `${firstMsg.channel}`, inline: true },
                { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // ----------------------------------------------------------------------
    // 2. ÜYE OLAYLARI
    // ----------------------------------------------------------------------
    client.on('guildMemberAdd', async (member) => {
        const data = await ModLog.findOne({ guildID: member.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = member.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('👋 Yeni Üye Katıldı')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 4096 }))
            .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true, size: 4096 }) })
            .addFields(
                { name: '👤 Kullanıcı', value: `${member} (${member.id})`, inline: false },
                { name: '📅 Hesap Oluşturma', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '⏰ Katılma', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                { name: '👥 Toplam Üye', value: `\`${member.guild.memberCount}\``, inline: true }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('guildMemberRemove', async (member) => {
        const data = await ModLog.findOne({ guildID: member.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = member.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(member.guild, AuditLogEvent.MemberKick, member.id);

        const embed = new EmbedBuilder()
            .setColor(executor ? '#FF8C00' : '#FFA500')
            .setTitle(executor ? '👢 Sunucudan Atıldı (Kick)' : '🚪 Sunucudan Ayrıldı')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 4096 }))
            .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true, size: 4096 }) })
            .addFields(
                { name: '👤 Kullanıcı', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: '🛠️ Yetkili', value: executor ? `${executor}` : 'Yok', inline: true },
                { name: '📄 Sebep', value: executor?.reason || 'Belirtilmemiş / Kendi çıktı', inline: false },
                { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '👥 Kalan Üye', value: `\`${member.guild.memberCount}\``, inline: true }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('guildBanAdd', async (ban) => {
        const data = await ModLog.findOne({ guildID: ban.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = ban.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);

        const embed = new EmbedBuilder()
            .setColor('#8B0000')
            .setTitle('🚫 Üye Yasaklandı')
            .setThumbnail(ban.user.displayAvatarURL({ dynamic: true, size: 4096 }))
            .setAuthor(safeExecutorAuthor(executor))
            .addFields(
                { name: '👤 Kullanıcı', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                { name: '🛠️ Yetkili', value: executor ? `${executor}` : 'Bilinmiyor', inline: true },
                { name: '📄 Sebep', value: ban.reason || 'Belirtilmemiş', inline: false },
                { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        const data = await ModLog.findOne({ guildID: newMember.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = newMember.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);

        // Timeout
        if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
            const embed = new EmbedBuilder()
                .setColor('#FF00FF')
                .setTitle('⏳ Timeout Atıldı')
                .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 4096 }))
                .setAuthor(safeExecutorAuthor(executor))
                .addFields(
                    { name: '👤 Kullanıcı', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
                    { name: '🛠️ Yetkili', value: executor ? `${executor}` : 'Bilinmiyor', inline: true },
                    { name: '⏰ Bitiş', value: `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:F>`, inline: false }
                )
                .setFooter(footer)
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        // Rol değişiklikleri
        const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        if (added.size || removed.size) {
            let desc = '';
            if (added.size) desc += `🟢 **Eklenen:** ${added.map(r => r).join(' ')}\n`;
            if (removed.size) desc += `🔴 **Kaldırılan:** ${removed.map(r => r).join(' ')}`;

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('🎭 Rol Değişikliği')
                .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 4096 }))
                .setAuthor(safeExecutorAuthor(executor))
                .setDescription(`**${newMember.user.tag}** için:\n${desc}`)
                .addFields({ name: '🆔 ID', value: `\`${newMember.id}\``, inline: true })
                .setFooter(footer)
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }

        // Nick değişikliği
        if (oldMember.nickname !== newMember.nickname) {
            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🏷️ Takma Ad Değişti')
                .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 4096 }))
                .setAuthor(safeExecutorAuthor(executor))
                .addFields(
                    { name: '👤 Kullanıcı', value: `${newMember.user.tag} (${newMember.id})`, inline: false },
                    { name: '⬅️ Eski', value: oldMember.nickname || '*Yok*', inline: true },
                    { name: '➡️ Yeni', value: newMember.nickname || '*Yok*', inline: true }
                )
                .setFooter(footer)
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    });

    // ----------------------------------------------------------------------
    // 3. SUNUCU YAPISI OLAYLARI
    // ----------------------------------------------------------------------
    client.on('channelCreate', async (channel) => {
        if (!channel.guild) return;
        const data = await ModLog.findOne({ guildID: channel.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = channel.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('➕ Kanal Oluşturuldu')
            .setAuthor(safeExecutorAuthor(executor))
            .addFields(
                { name: '📍 İsim', value: channel.name, inline: true },
                { name: '📑 Tip', value: ChannelType[channel.type]?.replace(/([A-Z])/g, ' $1').trim() || 'Bilinmeyen', inline: true },
                { name: '🆔 ID', value: `\`${channel.id}\``, inline: true },
                { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('channelDelete', async (channel) => {
        if (!channel.guild) return;
        const data = await ModLog.findOne({ guildID: channel.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = channel.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);

        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('➖ Kanal Silindi')
            .setAuthor(safeExecutorAuthor(executor))
            .addFields(
                { name: '📍 İsim', value: channel.name, inline: true },
                { name: '📑 Tip', value: ChannelType[channel.type]?.replace(/([A-Z])/g, ' $1').trim() || 'Bilinmeyen', inline: true },
                { name: '🆔 ID', value: `\`${channel.id}\``, inline: true },
                { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('channelUpdate', async (oldChannel, newChannel) => {
        if (!oldChannel.guild) return;
        const data = await ModLog.findOne({ guildID: oldChannel.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = oldChannel.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(oldChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);

        let changes = [];
        if (oldChannel.name !== newChannel.name) changes.push(`**İsim:** \`${oldChannel.name}\` ➡️ \`${newChannel.name}\``);
        if (oldChannel.topic !== newChannel.topic) changes.push(`**Konu:** Değişti`);
        if (oldChannel.nsfw !== newChannel.nsfw) changes.push(`**NSFW:** \`${oldChannel.nsfw}\` ➡️ \`${newChannel.nsfw}\``);
        if (changes.length === 0) return;

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('⚙️ Kanal Güncellendi')
            .setAuthor(safeExecutorAuthor(executor))
            .setDescription(`${newChannel} kanalında:\n${changes.join('\n')}`)
            .addFields({ name: '🆔 ID', value: `\`${newChannel.id}\``, inline: true })
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('roleCreate', async (role) => {
        const data = await ModLog.findOne({ guildID: role.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = role.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('➕ Rol Oluşturuldu')
            .setAuthor(safeExecutorAuthor(executor))
            .addFields(
                { name: '🏷️ İsim', value: role.name, inline: true },
                { name: '🌈 Renk', value: role.hexColor === '#000000' ? 'Varsayılan' : role.hexColor, inline: true },
                { name: '🆔 ID', value: `\`${role.id}\``, inline: true },
                { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('roleDelete', async (role) => {
        const data = await ModLog.findOne({ guildID: role.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = role.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);

        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('➖ Rol Silindi')
            .setAuthor(safeExecutorAuthor(executor))
            .addFields(
                { name: '🏷️ İsim', value: role.name, inline: true },
                { name: '🆔 ID', value: `\`${role.id}\``, inline: true },
                { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('roleUpdate', async (oldRole, newRole) => {
        const data = await ModLog.findOne({ guildID: oldRole.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = oldRole.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(oldRole.guild, AuditLogEvent.RoleUpdate, newRole.id);

        let changes = [];
        if (oldRole.name !== newRole.name) changes.push(`**İsim:** \`${oldRole.name}\` ➡️ \`${newRole.name}\``);
        if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Renk:** \`${oldRole.hexColor}\` ➡️ \`${newRole.hexColor}\``);
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('**İzinler:** Değişti');
        if (changes.length === 0) return;

        const embed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('⚖️ Rol Güncellendi')
            .setAuthor(safeExecutorAuthor(executor))
            .setDescription(`**${newRole.name}** rolünde:\n${changes.join('\n')}`)
            .addFields({ name: '🆔 ID', value: `\`${newRole.id}\``, inline: true })
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('emojiCreate', async (emoji) => {
        const data = await ModLog.findOne({ guildID: emoji.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = emoji.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('😀 Yeni Emoji Eklendi')
            .setAuthor(safeExecutorAuthor(executor))
            .addFields(
                { name: 'İsim', value: `\`:${emoji.name}:\``, inline: true },
                { name: 'Önizleme', value: emoji.toString(), inline: true },
                { name: '🆔 ID', value: `\`${emoji.id}\``, inline: true }
            )
            .setThumbnail(emoji.url)
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('guildUpdate', async (oldGuild, newGuild) => {
        const data = await ModLog.findOne({ guildID: oldGuild.id });
        if (!data?.logChannelID) return;
        const logChannel = oldGuild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);

        let changes = [];
        if (oldGuild.name !== newGuild.name) changes.push(`**Sunucu Adı:** \`${oldGuild.name}\` ➡️ \`${newGuild.name}\``);
        if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push(`**Doğrulama:** Değişti`);
        if (oldGuild.icon !== newGuild.icon) changes.push('**İkon:** Değişti');
        if (changes.length === 0) return;

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🏰 Sunucu Ayarları Güncellendi')
            .setAuthor(safeExecutorAuthor(executor))
            .setDescription(changes.join('\n'))
            .setFooter(footer)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // ----------------------------------------------------------------------
    // 4. SES OLAYLARI
    // ----------------------------------------------------------------------
    client.on('voiceStateUpdate', async (oldState, newState) => {
        if (newState.member?.user?.bot) return;

        const data = await ModLog.findOne({ guildID: newState.guild.id });
        if (!data?.logChannelID) return;
        const logChannel = newState.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const user = newState.member.user;
        const embed = new EmbedBuilder()
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true, size: 4096 }) })
            .setFooter(footer)
            .setTimestamp();

        if (!oldState.channelId && newState.channelId) {
            embed.setColor('#2ECC71').setDescription(`🔊 **${newState.channel.name}** kanalına katıldı.`);
        } else if (oldState.channelId && !newState.channelId) {
            embed.setColor('#E74C3C').setDescription(`🔇 **${oldState.channel.name}** kanalından ayrıldı.`);
        } else if (oldState.channelId !== newState.channelId) {
            embed.setColor('#3498DB').setDescription(`🔁 **${oldState.channel.name}** ➡️ **${newState.channel.name}**`);
        } else if (oldState.selfMute !== newState.selfMute) {
            embed.setColor('#9B59B6').setDescription(`🎤 Mikrofon **${newState.selfMute ? 'kapattı' : 'açtı'}**.`);
        } else if (oldState.selfDeaf !== newState.selfDeaf) {
            embed.setColor('#9B59B6').setDescription(`🎧 Kulaklık **${newState.selfDeaf ? 'kapattı' : 'açtı'}**.`);
        } else return;

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });
};
