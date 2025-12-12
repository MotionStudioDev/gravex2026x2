const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
// Model dosyasının yolu
const ModLog = require('../models/modlog');

module.exports = (client) => {

    // --- YARDIMCI FONKSİYON: Denetim Kaydı Çekici ---
    // Bir olayı kimin yaptığını (executor) bulmak için kullanılır.
    const getExecutor = async (guild, type, targetId) => {
        try {
            // Son 10 saniye içindeki ilgili Audit Log kaydını çeker
            const fetchedLogs = await guild.fetchAuditLogs({ limit: 1, type: type });
            const log = fetchedLogs.entries.first();
            
            if (log && log.target.id === targetId && log.createdTimestamp > Date.now() - 10000) {
                return log.executor;
            }
        } catch (e) {
            return null; // Yetki yoksa veya hata oluşursa null döner
        }
        return null;
    };

    // ----------------------------------------------------------------------
    // 1. MESAJ OLAYLARI
    // ----------------------------------------------------------------------

    // Mesaj Silindi
    client.on('messageDelete', async (message) => {
        if (!message.guild || message.author?.bot) return;
        const data = await ModLog.findOne({ guildID: message.guild.id });
        if (!data) return;
        const logChannel = message.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        // Mesajı kimin sildiğini bulmaya çalış (silme yetkisine sahip biriyse)
        const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete, message.author.id);

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setAuthor({ name: 'Mesaj Silindi', iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: '👤 Yazar', value: `${message.author.tag}`, inline: true },
                { name: '🗑️ Sildi', value: executor ? `${executor.tag}` : 'Yazar veya Bilinmiyor', inline: true },
                { name: '📍 Kanal', value: `${message.channel}`, inline: true },
                { name: '📄 İçerik', value: message.content ? message.content.substring(0, 1000) : "*İçerik yok (Görsel/Embed/Kısa)*" }
            )
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Mesaj Düzenlendi
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (!oldMessage.guild || oldMessage.author?.bot || oldMessage.content === newMessage.content) return;
        const data = await ModLog.findOne({ guildID: oldMessage.guild.id });
        if (!data) return;
        const logChannel = oldMessage.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('Yellow')
            .setAuthor({ name: 'Mesaj Düzenlendi', iconURL: oldMessage.author.displayAvatarURL() })
            .addFields(
                { name: '👤 Kullanıcı', value: `${oldMessage.author.tag}`, inline: true },
                { name: '📍 Kanal', value: `${oldMessage.channel}`, inline: true },
                { name: '⬅️ Eski Mesaj', value: oldMessage.content ? oldMessage.content.substring(0, 1000) : "Boş" },
                { name: '➡️ Yeni Mesaj', value: newMessage.content ? newMessage.content.substring(0, 1000) : "Boş" }
            )
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });
    
    // Toplu Mesaj Silme (Purge)
    client.on('messageDeleteBulk', async (messages) => {
        const firstMsg = messages.first();
        if (!firstMsg || !firstMsg.guild) return;

        const data = await ModLog.findOne({ guildID: firstMsg.guild.id });
        if (!data) return;
        const logChannel = firstMsg.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#FF5500')
            .setTitle('🧹 Toplu Mesaj Silme (Purge)')
            .setDescription(`**${firstMsg.channel}** kanalında **${messages.size}** adet mesaj silindi.`)
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // ----------------------------------------------------------------------
    // 2. ÜYE MODERASYON VE DURUM OLAYLARI
    // ----------------------------------------------------------------------
    
    // Üye Sunucuya Katıldı (Join)
    client.on('guildMemberAdd', async (member) => {
        const data = await ModLog.findOne({ guildID: member.guild.id });
        if (!data) return;
        const logChannel = member.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('👋 Yeni Üye Katıldı')
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '👤 Kullanıcı', value: `${member.user.tag} (${member.user.id})`, inline: false },
                { name: '📅 Hesap Oluşturma', value: `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:f>`, inline: true },
                { name: '⏳ Katılma Zamanı', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Üye Sunucudan Ayrıldı (Leave / Kick)
    client.on('guildMemberRemove', async (member) => {
        const data = await ModLog.findOne({ guildID: member.guild.id });
        if (!data) return;
        const logChannel = member.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        // Kick Kontrolü
        const executor = await getExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
        
        let actionType = 'Çıkış Yaptı (Leave)';
        let color = '#FFA500'; 
        let reason = "Kendi çıktı";

        if (executor) {
            actionType = 'Sunucudan Atıldı (Kick)';
            color = '#FF8C00'; 
            reason = executor.reason || "Belirtilmemiş";
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`🚪 ${actionType}`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '👤 Kullanıcı', value: `${member.user.tag} (${member.user.id})`, inline: false },
                { name: '🛠️ Yetkili', value: executor ? executor.tag : 'Yok', inline: true },
                { name: '📄 Sebep', value: reason, inline: true }
            )
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Üye Yasaklandı (Ban)
    client.on('guildBanAdd', async (ban) => {
        const data = await ModLog.findOne({ guildID: ban.guild.id });
        if (!data) return;
        const logChannel = ban.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        // Banı kimin attığını bulma
        const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
        
        const embed = new EmbedBuilder()
            .setColor('#8B0000') 
            .setTitle('🚫 Üye Yasaklandı (Ban)')
            .setThumbnail(ban.user.displayAvatarURL())
            .addFields(
                { name: '👤 Kullanıcı', value: `${ban.user.tag} (${ban.user.id})`, inline: false },
                { name: '🛠️ Yetkili', value: executor ? executor.tag : 'Bilinmiyor/API', inline: true },
                { name: '📄 Sebep', value: ban.reason || "Belirtilmemiş", inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Üye Bilgileri Güncellendi (Rol/Nickname/Timeout)
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        const data = await ModLog.findOne({ guildID: newMember.guild.id });
        if (!data) return;
        const logChannel = newMember.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;
        
        const memberUser = newMember.user;
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);

        // --- 1. Timeout (Zaman Aşımı) Kontrolü ---
        if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
            const embed = new EmbedBuilder()
                .setColor('#FF00FF')
                .setTitle('⏳ Kullanıcı Susturuldu (Timeout)')
                .setThumbnail(memberUser.displayAvatarURL())
                .addFields(
                    { name: '👤 Kullanıcı', value: `${memberUser.tag}`, inline: true },
                    { name: '🛠️ Yetkili', value: `${executor?.tag || "Bilinmiyor"}`, inline: true },
                    { name: '📅 Bitiş', value: `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:f>` }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(() => {});
            return;
        }

        // --- 2. Rol Değişikliği Kontrolü ---
        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
            const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
            
            if (addedRoles.size === 0 && removedRoles.size === 0) return;

            let description = `**${memberUser.tag}** kullanıcısının rolleri **${executor?.tag || "Bilinmiyor"}** tarafından güncellendi.`;
            
            if (addedRoles.size > 0) description += `\n\n🟢 **Eklenen Roller:**\n${addedRoles.map(r => r.name).join(', ')}`;
            if (removedRoles.size > 0) description += `\n\n🔴 **Kaldırılan Roller:**\n${removedRoles.map(r => r.name).join(', ')}`;

            const roleEmbed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('🎭 Üye Rolleri Güncellendi')
                .setDescription(description)
                .setTimestamp();
            logChannel.send({ embeds: [roleEmbed] }).catch(() => {});
        }

        // --- 3. Nickname Değişikliği Kontrolü ---
        if (oldMember.nickname !== newMember.nickname) {
            const nicknameEmbed = new EmbedBuilder()
                .setColor('Purple')
                .setTitle('🏷️ Takma Ad (Nickname) Değişti')
                .addFields(
                    { name: '👤 Kullanıcı', value: `${memberUser.tag}`, inline: false },
                    { name: '⬅️ Eski Nickname', value: oldMember.nickname || 'Yok', inline: true },
                    { name: '➡️ Yeni Nickname', value: newMember.nickname || 'Yok', inline: true }
                )
                .setFooter({ text: `Yetkili: ${executor?.tag || "Kullanıcı"}` })
                .setTimestamp();
            logChannel.send({ embeds: [nicknameEmbed] }).catch(() => {});
        }
    });

    // ----------------------------------------------------------------------
    // 3. SUNUCU YAPISI OLAYLARI (KANAL/ROL/EMOJI)
    // ----------------------------------------------------------------------

    // Kanal Oluşturuldu
    client.on('channelCreate', async (channel) => {
        if (!channel.guild) return;
        const data = await ModLog.findOne({ guildID: channel.guild.id });
        if (!data) return;
        const logChannel = channel.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('➕ Kanal Oluşturuldu')
            .setAuthor({ name: executor?.tag || 'Bilinmeyen Yetkili', iconURL: executor?.displayAvatarURL() })
            .addFields(
                { name: '📍 İsim', value: channel.name, inline: true },
                { name: '📑 Tip', value: ChannelType[channel.type].replace(/([A-Z])/g, ' $1').trim(), inline: true },
                { name: '🔒 Gizli', value: channel.permissionsLocked ? 'Evet' : 'Hayır', inline: true }
            )
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Kanal Silindi
    client.on('channelDelete', async (channel) => {
        if (!channel.guild) return;
        const data = await ModLog.findOne({ guildID: channel.guild.id });
        if (!data) return;
        const logChannel = channel.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);

        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('➖ Kanal Silindi')
            .setAuthor({ name: executor?.tag || 'Bilinmeyen Yetkili', iconURL: executor?.displayAvatarURL() })
            .addFields(
                { name: '📍 İsim', value: channel.name, inline: true },
                { name: '📑 Tip', value: ChannelType[channel.type].replace(/([A-Z])/g, ' $1').trim(), inline: true },
                { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }
            )
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });
    
    // Kanal Ayarları Güncellendi (İsim, Konu, NSFW vb.)
    client.on('channelUpdate', async (oldChannel, newChannel) => {
        if (!oldChannel.guild) return;
        const data = await ModLog.findOne({ guildID: oldChannel.guild.id });
        if (!data) return;
        const logChannel = oldChannel.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(oldChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
        
        let changes = [];
        if (oldChannel.name !== newChannel.name) changes.push(`**İsim:** \`${oldChannel.name}\` ➡️ \`${newChannel.name}\``);
        if (oldChannel.topic !== newChannel.topic) changes.push(`**Konu:** \`${oldChannel.topic || "Yok"}\` ➡️ \`${newChannel.topic || "Yok"}\``);
        if (oldChannel.nsfw !== newChannel.nsfw) changes.push(`**NSFW:** \`${oldChannel.nsfw}\` ➡️ \`${newChannel.nsfw}\``);

        if (changes.length === 0) return;

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('⚙️ Kanal Ayarları Güncellendi')
            .setAuthor({ name: executor?.tag || 'Bilinmeyen Yetkili', iconURL: executor?.displayAvatarURL() })
            .setDescription(`${newChannel} kanalında değişiklikler yapıldı:\n${changes.join('\n')}`)
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Rol Oluşturuldu
    client.on('roleCreate', async (role) => {
        const data = await ModLog.findOne({ guildID: role.guild.id });
        if (!data) return;
        const logChannel = role.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('➕ Rol Oluşturuldu')
            .setAuthor({ name: executor?.tag || 'Bilinmeyen Yetkili', iconURL: executor?.displayAvatarURL() })
            .addFields(
                { name: '🏷️ İsim', value: role.name, inline: true },
                { name: '🌈 Renk', value: role.hexColor === '#000000' ? 'Varsayılan' : role.hexColor, inline: true },
                { name: '🆔 ID', value: `\`${role.id}\``, inline: false }
            )
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Rol Silindi
    client.on('roleDelete', async (role) => {
        const data = await ModLog.findOne({ guildID: role.guild.id });
        if (!data) return;
        const logChannel = role.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;
        
        const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);

        const embed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('➖ Rol Silindi')
            .setAuthor({ name: executor?.tag || 'Bilinmeyen Yetkili', iconURL: executor?.displayAvatarURL() })
            .addFields(
                { name: '🏷️ İsim', value: role.name, inline: true },
                { name: '🆔 ID', value: `\`${role.id}\``, inline: true }
            )
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Rol Yetkileri Güncellendi (İsim, Renk, İzinler)
    client.on('roleUpdate', async (oldRole, newRole) => {
        const data = await ModLog.findOne({ guildID: oldRole.guild.id });
        if (!data) return;
        const logChannel = oldRole.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(oldRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
        
        let changes = [];
        if (oldRole.name !== newRole.name) changes.push(`**İsim:** \`${oldRole.name}\` ➡️ \`${newRole.name}\``);
        if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Renk:** \`${oldRole.hexColor}\` ➡️ \`${newRole.hexColor}\``);
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push(`**İzinler:** Değişti`);

        if (changes.length === 0) return;

        const embed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('⚖️ Rol Güncellendi')
            .setAuthor({ name: executor?.tag || 'Bilinmeyen Yetkili', iconURL: executor?.displayAvatarURL() })
            .setDescription(`**${newRole.name}** rolünde değişiklikler yapıldı:\n${changes.join('\n')}`)
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Emoji Eklendi
    client.on('emojiCreate', async (emoji) => {
        const data = await ModLog.findOne({ guildID: emoji.guild.id });
        if (!data || !data.logChannelID) return;
        const logChannel = emoji.guild.channels.cache.get(data.logChannelID);
        
        const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('😀 Yeni Emoji Eklendi')
            .addFields(
                { name: 'İsim', value: `\`:${emoji.name}:\``, inline: true },
                { name: 'Ekleyen', value: `${executor?.tag || "Bilinmiyor"}`, inline: true },
                { name: 'ID', value: `\`${emoji.id}\``, inline: false }
            )
            .setThumbnail(emoji.url);
        logChannel?.send({ embeds: [embed] }).catch(() => {});
    });

    // ----------------------------------------------------------------------
    // 4. SUNUCU & SES OLAYLARI
    // ----------------------------------------------------------------------
    
    // Sunucu Ayarları Değişti (İsim, İkon vb.)
    client.on('guildUpdate', async (oldGuild, newGuild) => {
        const data = await ModLog.findOne({ guildID: oldGuild.id });
        if (!data) return;
        const logChannel = oldGuild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const executor = await getExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
        let changes = [];
        if (oldGuild.name !== newGuild.name) changes.push(`**Sunucu İsmi:** \`${oldGuild.name}\` ➡️ \`${newGuild.name}\``);
        if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push(`**Doğrulama:** \`${oldGuild.verificationLevel}\` ➡️ \`${newGuild.verificationLevel}\``);
        if (oldGuild.icon !== newGuild.icon) changes.push(`**İkon:** Değişti`);

        if (changes.length === 0) return;

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🏰 Sunucu Ayarları Güncellendi')
            .setAuthor({ name: executor?.tag || 'Yetkili', iconURL: executor?.displayAvatarURL() })
            .setDescription(changes.join('\n'))
            .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Ses Kanalı Hareketleri (Join, Leave, Move)
    client.on('voiceStateUpdate', async (oldState, newState) => {
        if (newState.member.user.bot) return;
        const data = await ModLog.findOne({ guildID: newState.guild.id });
        if (!data) return;
        const logChannel = newState.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        let embed = new EmbedBuilder().setTimestamp().setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() });

        // Kanala Katıldı
        if (!oldState.channelId && newState.channelId) {
            embed.setColor('#2ECC71').setDescription(`🔊 **${newState.channel.name}** kanalına bağlandı.`);
        }
        // Kanaldan Ayrıldı
        else if (oldState.channelId && !newState.channelId) {
            embed.setColor('#E74C3C').setDescription(`🔇 **${oldState.channel.name}** kanalından ayrıldı.`);
        }
        // Kanal Değiştirdi
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            embed.setColor('#3498DB').setDescription(`🔁 Ses kanalı değiştirdi: **${oldState.channel.name}** ➡️ **${newState.channel.name}**`);
        } 
        // Mikrofon/Kulaklık Durumu
        else if (oldState.selfMute !== newState.selfMute) {
            embed.setColor('#9B59B6').setDescription(`🎤 **${newState.channel.name}** kanalında mikrofonunu **${newState.selfMute ? 'kapattı (susturdu)' : 'açtı'}**.`);
        }
        else if (oldState.selfDeaf !== newState.selfDeaf) {
            embed.setColor('#9B59B6').setDescription(`🎧 **${newState.channel.name}** kanalında kulaklığını **${newState.selfDeaf ? 'kapattı (sağırlaştırdı)' : 'açtı'}**.`);
        }
        else {
            return; // Alakasız bir durum (Stream açma vb.)
        }

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });
};
