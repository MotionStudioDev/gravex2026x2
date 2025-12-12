/*=======================================================================================*/

  /**
 * Modüller
 */

const {PermissionsBitField, EmbedBuilder, ButtonStyle, Client, GatewayIntentBits, ChannelType, Partials, ActionRowBuilder, SelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, SelectMenuInteraction, ButtonBuilder } = require("discord.js");
const { Collection } = require("discord.js");
const config = require("./config.js");
const fs = require("fs");
const db = require("orio.db");
const Discord = require("discord.js")
const moment = require('moment')
require('moment-duration-format')
moment.locale('tr')
/*=======================================================================================*/
/////////////////////MONGO 
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB’ye bağlanıldı!"))
  .catch(err => console.error("❌ MongoDB bağlantı hatası:", err));

/*=======================================================================================*/

  /**
 * Clients
 */

const client = new Client({
  partials: [
    Partials.Message, // Mesaj
    Partials.Channel, // Yazı kanalı
    Partials.GuildMember, // Sunucu üyesi
    Partials.Reaction, // Emoji mesajı
    Partials.GuildScheduledEvent, // Sunucu etkinliği
    Partials.User, // Discord üyesi
    Partials.ThreadMember, // Konu üyesi
  ],
  intents: [
    GatewayIntentBits.Guilds, // Sunucu ile ilgili şeyler 
    GatewayIntentBits.GuildMembers, // Sunucu üyeleri için ilgili şeyler
    GatewayIntentBits.GuildBans, // Sunucu yasaklarını yönetmek için
    GatewayIntentBits.GuildEmojisAndStickers, // Emojileri ve çıkartmaları yönetmek
    GatewayIntentBits.GuildIntegrations, // Discord Entegrasyonları
    GatewayIntentBits.GuildWebhooks, // Discord web kancaları
    GatewayIntentBits.GuildInvites, // Sunucu davet yönetimi için
    GatewayIntentBits.GuildVoiceStates, // Ses kanallarının yönetimi
    GatewayIntentBits.GuildPresences, // Sunucu sâhipliğinin yönetimi
    GatewayIntentBits.GuildMessages, // Sunucu mesajlarının yönetimi
    GatewayIntentBits.GuildMessageReactions, // Mesaj emojilerinin yönetimi
    GatewayIntentBits.GuildMessageTyping, // Mesaj yazmanın yönetimi
    GatewayIntentBits.DirectMessages, // Özel mesaj
    GatewayIntentBits.DirectMessageReactions, // Özel mesaj emojisi
    GatewayIntentBits.DirectMessageTyping, // Özel mesaj yazmak 
    GatewayIntentBits.MessageContent, // Mesaj içeriğine ihtiyacınız varsa etkinleştirin
  ],
});

module.exports = client;
/*=======================================================================================*/
  /**
 * Events loader.
 */
client.sayaçlar = new Map();
client.sayaçKanalları = new Map();

client.kufurEngel = new Map();        // guildId → true/false
client.kufurLogKanalları = new Map(); // guildId → kanalId

client.antiRaid = new Map();                   // guildId → { aktif: true, eşik: 5, süre: 10 }
client.antiRaidLogKanalları = new Map();       // guildId → kanalId
client.antiRaidGirişler = new Map();           // guildId → [timestamp1, timestamp2, ...]

client.emojiLogKanalları = new Map(); // guildId → kanalId
client.sesLogKanalları = new Map(); // guildId → kanalId
client.otoroller = new Map();           // guildId → rolId
client.otorolLogKanalları = new Map();  // guildId → kanalId
client.reklamLogKanalları = new Map(); // guildId → kanalId

client.on('interactionCreate', (interaction) => {
    require('./events/interactionCreate')(client, interaction);
});

client.on('emojiCreate', require('./events/emojiCreate'));
client.on('emojiDelete', require('./events/emojiDelete'));
client.on('emojiUpdate', require('./events/emojiUpdate'));

client.on('guildMemberAdd', require('./events/guildMemberAdd'));
client.on('guildMemberRemove', require('./events/guildMemberRemove'));
client.on('messageCreate', require('./events/messageCreate'));
require("./events/message.js")
require("./events/ready.js")


const guildLogs = require("./guildLogs");
guildLogs(client);
/*=======================================================================================*/

/*=======================================================================================*/
let x = process.env.TOKEN;

/**
 * Token
 */
client.login(x).catch(e => {
  
  if (!x) {
    console.log("Lütfen bir token gir (process.env.TOKEN ayarlanmamış)");
    process.exit(0);
  }

  if (e.toString().includes("TOKEN_INVALID")) {
    console.log("Lütfen düzgün bir token gir");
    process.exit(0);
  }

  if (e.toString().includes("DISALLOWED_INTENTS")) {
    console.log("Lütfen botunun intentlerini aç. (Discord Developer Portal → Bot → Privileged Gateway Intents)");
    process.exit(0);
  }

  console.error(e);
  process.exit(0);

});


/*=======================================================================================*/

// ... Discord Client başlatma kodunuz ...
/////////////////////////////CAPS ENGELLL
const GuildSettings = require("./models/GuildSettings");

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const settings = await GuildSettings.findOne({ guildId: message.guild.id });
  if (!settings || !settings.capsLockEngel) return;

  const content = message.content;
  const letters = content.replace(/[^a-zA-ZĞÜŞİÖÇğüşiöç]/g, "");
  if (letters.length < 5) return; // kısa mesajları engelleme

  const upperCount = letters.split("").filter(ch => ch === ch.toUpperCase()).length;
  const ratio = upperCount / letters.length;

  if (ratio >= 0.7) { // %70+ büyük harf
    try {
      await message.delete();

      // Kullanıcıya uyarı embed
      const warnEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("<a:uyar1:1416526541030035530> CAPS-LOCK Tespit Edildi")
        .setDescription(`${message.author}, lütfen tüm mesajı büyük harflerle yazmayın.`);

      const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
      setTimeout(() => warnMsg.delete().catch(() => {}), 3000);

      // Log kanalına gönder
      const logKanalId = settings.capsLockLog;
      const logKanal = logKanalId ? message.guild.channels.cache.get(logKanalId) : null;

      if (logKanal && logKanal.permissionsFor(message.client.user).has("SendMessages")) {
        const logEmbed = new EmbedBuilder()
          .setColor("DarkBlue")
          .setTitle("🛑 CAPS-LOCK Logu")
          .addFields(
            { name: "Kullanıcı", value: `${message.author.tag} (${message.author.id})` },
            { name: "Kanal", value: `<#${message.channel.id}>`, inline: true },
            { name: "Mesaj İçeriği", value: `\`\`\`${message.content}\`\`\`` },
            { name: "Büyük Harf Oranı", value: `%${Math.round(ratio * 100)}`, inline: true },
            { name: "Zaman", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
          )
          .setFooter({ text: "Grave Caps-lock engel sistemi" });
        logKanal.send({ embeds: [logEmbed] });
      }
    } catch (err) {
      console.error("Caps-lock mesajı silinemedi veya log gönderilemedi:", err);
    }
  }
});
////////////////////////// CAPS ENGEL
client.on('interactionCreate', async interaction => {
    // Sadece buton etkileşimlerini dinle
    if (!interaction.isButton()) return;
    
    // Custom ID'si '2048_' ile başlayan butonlara odaklan
    if (interaction.customId.startsWith('2048_')) {
        
        // 1. Komut dosyasını (2048.js) client.commands koleksiyonundan bul
        const command = client.commands.get('2048'); // Komut adınız '2048' olduğu varsayılıyor
        
        // 2. Eğer komut mevcutsa ve handleMove fonksiyonuna sahipse çalıştır
        if (command && command.handleMove) {
            try {
                // handleMove fonksiyonunu çağırıyoruz
                await command.handleMove(interaction);
            } catch (error) {
                console.error('2048 Buton İşleme Hatası:', error);
                // KullanıcıyaEphemeral (gizli) hata mesajı gönderme
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({ content: 'Bu hareketi işlerken bir hata oluştu.', ephemeral: true });
                }
            }
        }
    }
});
//////// DEPREM SİSTEMİ 
client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'deprem_filter') {
        const command = client.commands.get('deprem');
        if (command && command.showFilterModal) {
            await command.showFilterModal(interaction);
        }
    }
});
////// deprem 2 
client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit() && interaction.customId === 'deprem_filter_modal') {
        const command = client.commands.get('deprem');
        if (command && command.handleModalSubmission) {
            await command.handleModalSubmission(interaction);
        }
    }
});
/////// mod log
const ModLog = require('./models/modlog'); 

// -----------------------------------------------------------------------------------
// ANA OLAY DİNLEYİCİLERİ
// -----------------------------------------------------------------------------------

module.exports = (client) => {
    
    // --- 1. MESAJ LOGLAMA ---
    
    // Mesaj Silindi
    client.on('messageDelete', async (message) => {
        if (!message.guild || message.author.bot) return;

        const data = await ModLog.findOne({ guildID: message.guild.id });
        if (!data) return;

        const logChannel = message.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('Red')
            .setAuthor({ name: 'Mesaj Silindi', iconURL: message.author.avatarURL() })
            .addFields(
                { name: '👤 Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: '📍 Kanal', value: `${message.channel}`, inline: true },
                { name: '📄 Mesaj İçeriği', value: message.content || "*Mesaj içeriği bulunamadı (Görsel veya Embed olabilir)*" }
            )
            .setTimestamp();

        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    });

    // Mesaj Düzenlendi
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (!oldMessage.guild || oldMessage.author.bot || oldMessage.content === newMessage.content) return;

        const data = await ModLog.findOne({ guildID: oldMessage.guild.id });
        if (!data) return;

        const logChannel = oldMessage.guild.channels.cache.get(data.logChannelID);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('Yellow')
            .setAuthor({ name: 'Mesaj Düzenlendi', iconURL: oldMessage.author.avatarURL() })
            .addFields(
                { name: '👤 Kullanıcı', value: `${oldMessage.author.tag}`, inline: true },
                { name: '📍 Kanal', value: `${oldMessage.channel}`, inline: true },
                { name: '⬅️ Eski Mesaj', value: oldMessage.content || "Boş" },
                { name: '➡️ Yeni Mesaj', value: newMessage.content || "Boş" }
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

        const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: 22 }).catch(() => null);
        const banLog = fetchedLogs?.entries.first();
        let executor = "Bilinmiyor/API";

        if (banLog && banLog.target.id === ban.user.id && banLog.createdTimestamp > Date.now() - 5000) {
            executor = banLog.executor.tag;
        }

        const logEmbed = new EmbedBuilder()
            .setColor('#8B0000') // Koyu Kırmızı (Ban)
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

        // Kick kontrolü için Denetim Kayıtları
        const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: 20 }).catch(() => null);
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

