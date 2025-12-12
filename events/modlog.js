// ✅ EKSİK OLAN TANIMLAMA EKLENDİ
const { EmbedBuilder, AuditLogEvent } = require('discord.js');

// Model dosyasının yolu: Eğer bu dosya 'events' klasöründeyse,
// 'models' klasörüne ulaşmak için bir üst dizine (../) çıkmalıyız.
const ModLog = require('../models/modlog'); 

module.exports = (client) => {
    
    // --- 1. MESAJ LOGLAMA ---
    
    // Mesaj Silindi
    client.on('messageDelete', async (message) => {
        if (!message.guild || message.author?.bot) return;

        const data = await ModLog.findOne({ guildID: message.guild.id });
        if (!data) return;

        const logChannel = message.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('Red')
            .setAuthor({ name: 'Mesaj Silindi', iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: '👤 Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: '📍 Kanal', value: `${message.channel}`, inline: true },
                { name: '📄 Mesaj İçeriği', value: message.content ? message.content.substring(0, 1000) : "*Mesaj içeriği yok (Görsel/Embed olabilir)*" }
            )
            .setTimestamp();

        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    });

    // Mesaj Düzenlendi
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        // Bot mesajları, sunucu dışı mesajlar ve içerik değişmediyse (sadece embed eklendiyse) işlem yapma
        if (!oldMessage.guild || oldMessage.author?.bot || oldMessage.content === newMessage.content) return;

        const data = await ModLog.findOne({ guildID: oldMessage.guild.id });
        if (!data) return;

        const logChannel = oldMessage.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('Yellow')
            .setAuthor({ name: 'Mesaj Düzenlendi', iconURL: oldMessage.author.displayAvatarURL() })
            .addFields(
                { name: '👤 Kullanıcı', value: `${oldMessage.author.tag}`, inline: true },
                { name: '📍 Kanal', value: `${oldMessage.channel}`, inline: true },
                { name: '⬅️ Eski Mesaj', value: oldMessage.content ? oldMessage.content.substring(0, 1000) : "Boş" },
                { name: '➡️ Yeni Mesaj', value: newMessage.content ? newMessage.content.substring(0, 1000) : "Boş" }
            )
            .setTimestamp();

        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    });

    // --- 2. ÜYE LOGLAMA (GİRİŞ/ÇIKIŞ/BAN/KICK) ---

    // Üye Yasaklandı (Ban)
    client.on('guildBanAdd', async (ban) => {
        const data = await ModLog.findOne({ guildID: ban.guild.id });
        if (!data) return;

        const logChannel = ban.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        // Audit Log (Denetim Kaydı) Kontrolü
        const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
        const banLog = fetchedLogs?.entries.first();
        let executor = "Bilinmiyor/API";

        if (banLog && banLog.target.id === ban.user.id && banLog.createdTimestamp > Date.now() - 5000) {
            executor = banLog.executor.tag;
        }

        const logEmbed = new EmbedBuilder()
            .setColor('#8B0000') // Koyu Kırmızı
            .setTitle('🚫 Üye Yasaklandı (Ban)')
            .setThumbnail(ban.user.displayAvatarURL())
            .addFields(
                { name: '👤 Kullanıcı', value: `${ban.user.tag} (${ban.user.id})`, inline: false },
                { name: '🛠️ Yetkili', value: executor, inline: true },
                { name: '📄 Sebep', value: ban.reason || "Belirtilmemiş", inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    });

    // Üye Sunucudan Ayrıldı (Leave / Kick)
    client.on('guildMemberRemove', async (member) => {
        const data = await ModLog.findOne({ guildID: member.guild.id });
        if (!data) return;

        const logChannel = member.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        // Kick Kontrolü
        const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick }).catch(() => null);
        const kickLog = fetchedLogs?.entries.first();
        
        let executor = "Bilinmiyor/Kendi Çıktı";
        let actionType = 'Çıkış Yaptı (Leave)';
        let color = '#FFA500'; 

        if (kickLog && kickLog.target.id === member.user.id && kickLog.createdTimestamp > Date.now() - 5000) {
            executor = kickLog.executor.tag;
            actionType = 'Sunucudan Atıldı (Kick)';
            color = '#FF8C00'; 
        }

        const logEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`🚪 ${actionType}`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '👤 Kullanıcı', value: `${member.user.tag} (${member.user.id})`, inline: false },
                { name: '🛠️ Yetkili', value: executor, inline: true },
                { name: '📄 Sebep', value: kickLog?.reason || "Belirtilmemiş", inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    });

    // Üye Bilgileri Güncellendi (Rol/Nickname)
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        const data = await ModLog.findOne({ guildID: newMember.guild.id });
        if (!data) return;

        const logChannel = newMember.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;
        
        // Rol Değişikliği
        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
            const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
            
            let description = `**${newMember.user.tag}** kullanıcısının rolleri güncellendi.`;
            
            if (addedRoles.size > 0) description += `\n\n🟢 **Eklenen Roller:**\n${addedRoles.map(r => r.name).join(', ')}`;
            if (removedRoles.size > 0) description += `\n\n🔴 **Kaldırılan Roller:**\n${removedRoles.map(r => r.name).join(', ')}`;

            // Eğer embed boş kalacaksa (sadece @everyone gibi görünmez roller değiştiyse) gönderme
            if (addedRoles.size === 0 && removedRoles.size === 0) return;

            const roleEmbed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('🎭 Üye Rolleri Güncellendi')
                .setDescription(description)
                .setTimestamp();
            logChannel.send({ embeds: [roleEmbed] }).catch(() => {});
        }

        // Nickname Değişikliği
        if (oldMember.nickname !== newMember.nickname) {
            const nicknameEmbed = new EmbedBuilder()
                .setColor('Purple')
                .setTitle('🏷️ Takma Ad (Nickname) Değişti')
                .addFields(
                    { name: '👤 Kullanıcı', value: `${newMember.user.tag}`, inline: false },
                    { name: '⬅️ Eski Nickname', value: oldMember.nickname || 'Yok', inline: true },
                    { name: '➡️ Yeni Nickname', value: newMember.nickname || 'Yok', inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [nicknameEmbed] }).catch(() => {});
        }
    });
    
    // --- 3. SUNUCU YAPISI LOGLAMA (KANAL/ROL) ---

    // Kanal Oluşturuldu
    client.on('channelCreate', async (channel) => {
        if (!channel.guild) return;
        const data = await ModLog.findOne({ guildID: channel.guild.id });
        if (!data) return;
        const logChannel = channel.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('➕ Kanal Oluşturuldu')
            .addFields(
                { name: '📍 İsim', value: channel.name, inline: true },
                { name: '📑 Tip', value: channel.type.toString().replace(/([A-Z])/g, ' $1').trim(), inline: true },
                { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }
            )
            .setTimestamp();
        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    });

    // Kanal Silindi
    client.on('channelDelete', async (channel) => {
        if (!channel.guild) return;
        const data = await ModLog.findOne({ guildID: channel.guild.id });
        if (!data) return;
        const logChannel = channel.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('➖ Kanal Silindi')
            .addFields(
                { name: '📍 İsim', value: channel.name, inline: true },
                { name: '📑 Tip', value: channel.type.toString().replace(/([A-Z])/g, ' $1').trim(), inline: true },
                { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }
            )
            .setTimestamp();
        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    });

    // Rol Oluşturuldu
    client.on('roleCreate', async (role) => {
        const data = await ModLog.findOne({ guildID: role.guild.id });
        if (!data) return;
        const logChannel = role.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('➕ Rol Oluşturuldu')
            .addFields(
                { name: '🏷️ İsim', value: role.name, inline: true },
                { name: '🌈 Renk', value: role.hexColor === '#000000' ? 'Varsayılan' : role.hexColor, inline: true },
                { name: '🆔 ID', value: `\`${role.id}\``, inline: false }
            )
            .setTimestamp();
        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    });

    // Rol Silindi
    client.on('roleDelete', async (role) => {
        const data = await ModLog.findOne({ guildID: role.guild.id });
        if (!data) return;
        const logChannel = role.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('➖ Rol Silindi')
            .addFields(
                { name: '🏷️ İsim', value: role.name, inline: true },
                { name: '🆔 ID', value: `\`${role.id}\``, inline: true }
            )
            .setTimestamp();
        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    });
};
