const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const TicketModel = require("../models/Ticket");
const AfkModel = require("../models/Afk");

const AUTO_CLOSE_TIMEOUT = 15 * 60 * 1000;

// Daha geniş ve akıllı küfür filtresi (Harf uzatmalarını yakalar: sssiiiikkk gibi)
const küfürRegex = /\b(amk|ananı|orospu|oç|oc|piç|pıç|yarrak|yarak|sik|sık|göt|salak|aptal|gerizekalı|ibne|siktir|sikik|amına|amcık|daşşak|taşşak)\b/i;

// Gelişmiş Reklam Paternleri
const reklamRegex = /(discord\.(gg|io|me|li)\/.+|https?:\/\/\S+|www\.\S+|\.com\b|\.net\b|\.org\b|\.xyz\b)/i;

module.exports = async (message) => {
    // Temel kontroller
    if (!message.guild || message.author.bot) return;
    const client = message.client;

    // KONTROL 1: Yönetici veya Yetkili mi? (Yetkililer korumaya takılmaz)
    const isStaff = message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                    message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // Mesaj içeriğini normalize et (Küfür/Reklam tespiti için boşlukları ve karakterleri düzenle)
    const normalizeContent = message.content.toLowerCase()
        .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s");

    // =========================================================
    // BOT ETİKETLENİNCE YANIT VER
    // =========================================================
    if (message.content.includes(`<@!${client.user.id}>`) || message.content.includes(`<@${client.user.id}>`)) {
        if (message.content.split(' ').length <= 2) {
             const embed = new EmbedBuilder()
                .setColor("Blurple")
                .setTitle("👋 Merhaba!")
                .setDescription("Beni etiketledin! Komutlar için `g!yardım` yazabilirsin.")
                .setFooter({ text: "GraveBOT • 2026" });
            return message.channel.send({ embeds: [embed] }).catch(() => {});
        }
    }

    // =========================================================
    // SUNUCU AYARLARINI ÇEK
    // =========================================================
    const settings = await GuildSettings.findOne({ guildId: message.guild.id });
    if (!settings) return;

    // =========================================================
    // 1. AFK SİSTEMİ (Kullanıcı mesaj yazınca AFK kalkar)
    // =========================================================
    const afkData = await AfkModel.findOne({ guildId: message.guildId, userId: message.author.id });
    if (afkData) {
        await AfkModel.deleteOne({ guildId: message.guildId, userId: message.author.id });
        if (message.member.manageable) {
            await message.member.setNickname(afkData.oldNickname).catch(() => {});
        }
        message.reply(`Hoş geldin **${message.author.username}**! AFK modundan çıkarıldın.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        return; // AFK kalkınca diğer filtrelere takılmasın
    }

    // Etiketlenen kişi AFK mı?
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(async (user) => {
            const data = await AfkModel.findOne({ guildId: message.guildId, userId: user.id });
            if (data && user.id !== message.author.id) {
                message.reply(`🛑 **${user.username}** şu an AFK! | **Sebep:** ${data.reason}`).then(m => setTimeout(() => m.delete().catch(() => {}), 10000));
            }
        });
    }

    // =========================================================
    // KÜFÜR ENGELLEME (Gelişmiş)
    // =========================================================
    if (settings.kufurEngel && !isStaff) {
        if (küfürRegex.test(normalizeContent)) {
            await message.delete().catch(() => {});
            const msg = await message.channel.send(`🚫 **${message.author}**, küfürlü içerik temizlendi!`);
            setTimeout(() => msg.delete().catch(() => {}), 5000);

            if (settings.kufurLog) {
                const logKanal = message.guild.channels.cache.get(settings.kufurLog);
                if (logKanal) {
                    const logEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("🛑 Küfür Engellendi")
                        .addFields(
                            { name: "Kullanıcı", value: `${message.author}` },
                            { name: "Mesaj", value: `\`${message.content}\`` }
                        ).setTimestamp();
                    logKanal.send({ embeds: [logEmbed] }).catch(() => {});
                }
            }
            return; // Küfür yakalandıysa reklam kontrolüne gerek yok
        }
    }

    // =========================================================
    // REKLAM ENGELLEME (Gelişmiş)
    // =========================================================
    if (settings.reklamEngel && !isStaff) {
        if (reklamRegex.test(message.content)) {
            await message.delete().catch(() => {});
            const msg = await message.channel.send(`⚠️ **${message.author}**, reklam ve link paylaşımı yasaktır!`);
            setTimeout(() => msg.delete().catch(() => {}), 5000);

            if (settings.reklamLog) {
                const logKanal = message.guild.channels.cache.get(settings.reklamLog);
                if (logKanal) {
                    const logEmbed = new EmbedBuilder()
                        .setColor("Orange")
                        .setTitle("🚫 Reklam Engellendi")
                        .addFields(
                            { name: "Kullanıcı", value: `${message.author}` },
                            { name: "İçerik", value: `\`${message.content}\`` }
                        ).setTimestamp();
                    logKanal.send({ embeds: [logEmbed] }).catch(() => {});
                }
            }
            return;
        }
    }

    // =========================================================
    // SELAM ALMA (SA-AS)
    // =========================================================
    if (settings.saasAktif) {
        const saList = ["sa", "selam", "sea", "selamün aleyküm", "selamun aleyküm"];
        if (saList.includes(normalizeContent.trim())) {
            const yanıtlar = ["Aleyküm selam, hoş geldin! 👋", "Aleyküm selam, nasılsın? ✨"];
            message.reply(yanıtlar[Math.floor(Math.random() * yanıtlar.length)]).catch(() => {});
        }
    }
};
