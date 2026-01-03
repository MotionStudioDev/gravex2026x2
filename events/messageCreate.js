const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const TicketModel = require("../models/Ticket");
const AfkModel = require("../models/Afk");

const AUTO_CLOSE_TIMEOUT = 15 * 60 * 1000;

// Filtreler (Gelişmiş Regex)
const küfürRegex = /\b(amk|ananı|orospu|oç|oc|piç|pıç|yarrak|yarak|sik|sık|göt|salak|aptal|gerizekalı|ibne|siktir|sikik|amına|amcık|daşşak|taşşak)\b/i;
const reklamRegex = /(discord\.(gg|io|me|li)\/.+|https?:\/\/\S+|www\.\S+|\.com\b|\.net\b|\.org\b|\.xyz\b)/i;

module.exports = async (message) => {
    if (!message.guild || message.author.bot) return;
    const client = message.client;
    const isStaff = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                    message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // İçerik Normalizasyonu
    const normalizeContent = message.content.toLowerCase()
        .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s");

    // =========================================================
    // 1. AFK SİSTEMİ (Embed)
    // =========================================================
    const afkData = await AfkModel.findOne({ guildId: message.guildId, userId: message.author.id });
    if (afkData) {
        await AfkModel.deleteOne({ guildId: message.guildId, userId: message.author.id });
        if (message.member.manageable) await message.member.setNickname(afkData.oldNickname).catch(() => {});

        const welcomeEmbed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({ name: "Tekrar Hoş Geldin!", iconURL: message.author.displayAvatarURL() })
            .setDescription(`**${message.author.username}**, AFK modundan başarıyla çıkarıldın.`)
            .setTimestamp();

        message.reply({ embeds: [welcomeEmbed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        return;
    }

    // Etiketlenen Kişi AFK mı? (Embed)
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(async (user) => {
            const data = await AfkModel.findOne({ guildId: message.guildId, userId: user.id });
            if (data && user.id !== message.author.id) {
                const afkInfoEmbed = new EmbedBuilder()
                    .setColor("Yellow")
                    .setTitle("🛑 Kullanıcı Şu An AFK")
                    .setDescription(`**${user.username}** şu an bilgisayar başında değil.`)
                    .addFields(
                        { name: "Sebep", value: `\`${data.reason}\``, inline: true },
                        { name: "Süre", value: `<t:${Math.floor(data.timestamp / 1000)}:R>`, inline: true }
                    )
                    .setFooter({ text: "Grave AFK Sistemi" });

                message.reply({ embeds: [afkInfoEmbed] }).then(m => setTimeout(() => m.delete().catch(() => {}), 10000));
            }
        });
    }

    // Sunucu Ayarları
    const settings = await GuildSettings.findOne({ guildId: message.guild.id });
    if (!settings) return;

    // =========================================================
    // 2. KÜFÜR ENGELLEME (Full Embed Log & Uyarı)
    // =========================================================
    if (settings.kufurEngel && !isStaff) {
        if (küfürRegex.test(normalizeContent)) {
            await message.delete().catch(() => {});
            
            const warningEmbed = new EmbedBuilder()
                .setColor("Red")
                .setAuthor({ name: "Küfür Engellendi", iconURL: message.author.displayAvatarURL() })
                .setDescription(`⚠️ **${message.author}**, bu sunucuda küfürlü kelimeler kullanılması yasaktır.`)
                .setFooter({ text: "Lütfen topluluk kurallarına uyun." });

            const msg = await message.channel.send({ embeds: [warningEmbed] });
            setTimeout(() => msg.delete().catch(() => {}), 5000);

            if (settings.kufurLog) {
                const logKanal = message.guild.channels.cache.get(settings.kufurLog);
                if (logKanal) {
                    const logEmbed = new EmbedBuilder()
                        .setColor("DarkRed")
                        .setTitle("🛑 Küfür Logu")
                        .addFields(
                            { name: "Kullanıcı", value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                            { name: "Kanal", value: `<#${message.channel.id}>`, inline: true },
                            { name: "Mesaj İçeriği", value: `\`\`\`${message.content}\`\`\`` }
                        )
                        .setTimestamp();
                    logKanal.send({ embeds: [logEmbed] }).catch(() => {});
                }
            }
            return;
        }
    }

    // =========================================================
    // 3. REKLAM ENGELLEME (Full Embed Log & Uyarı)
    // =========================================================
    if (settings.reklamEngel && !isStaff) {
        if (reklamRegex.test(message.content)) {
            await message.delete().catch(() => {});

            const reklamEmbed = new EmbedBuilder()
                .setColor("Orange")
                .setAuthor({ name: "Reklam Engellendi", iconURL: message.author.displayAvatarURL() })
                .setDescription(`🚫 **${message.author}**, sunucu içerisinde link ve reklam paylaşımı yapılamaz.`)
                .setThumbnail("https://i.imgur.com/8Nf9V8L.png"); // Buraya bir yasak ikonu koyabilirsin

            const msg = await message.channel.send({ embeds: [reklamEmbed] });
            setTimeout(() => msg.delete().catch(() => {}), 5000);

            if (settings.reklamLog) {
                const logKanal = message.guild.channels.cache.get(settings.reklamLog);
                if (logKanal) {
                    const logEmbed = new EmbedBuilder()
                        .setColor("DarkOrange")
                        .setTitle("🔗 Reklam Logu")
                        .addFields(
                            { name: "Kullanıcı", value: `${message.author}`, inline: true },
                            { name: "Kanal", value: `<#${message.channel.id}>`, inline: true },
                            { name: "Paylaşılan Link", value: `\`\`\`${message.content}\`\`\`` }
                        )
                        .setTimestamp();
                    logKanal.send({ embeds: [logEmbed] }).catch(() => {});
                }
            }
            return;
        }
    }

    // =========================================================
    // 4. SA-AS SİSTEMİ (Embed Yanıt)
    // =========================================================
    if (settings.saasAktif) {
        const saList = ["sa", "selam", "sea", "selamün aleyküm", "selamun aleyküm"];
        if (saList.includes(normalizeContent.trim())) {
            const saasEmbed = new EmbedBuilder()
                .setColor("Blue")
                .setDescription(`**Aleyküm Selam ${message.author}, Hoş Geldin!** ✨\nNasılsın, her şey yolunda mı?`)
                .setFooter({ text: "GraveBOT Selam Sistemi" });

            message.reply({ embeds: [saasEmbed] }).catch(() => {});
        }
    }
};
