const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const AfkModel = require("../models/Afk");
const moment = require("moment");
require("moment/locale/tr");

// Ayarlar
const UYARI_SILME_SURESI = 6000;
const CAPS_LIMIT_ORANI = 0.70;

// Gelişmiş Regex Arşivi (Türkçe Karakter Duyarlı)
const filtreler = {
    // Klasik küfürleri ve türevlerini yakalar
    kufur: /\b(amk|ananı|orospu|oç|oc|piç|pıç|yarrak|yarak|sik|sık|göt|salak|aptal|gerizekalı|ibne|siktir|sikik|amına|amcık|daşşak|taşşak|pipi|meme|fahişe|kahpe|yavşak|gevşek|pezevenk|şerefsiz|adi|it|lavuk)\b/i,
    // Discord linkleri ve her türlü URL
    reklam: /(discord\.(gg|io|me|li|club)\/.+|https?:\/\/\S+|www\.\S+|\.com\b|\.net\b|\.org\b|\.xyz\b|\.pw\b|\.tk\b|\.biz\b)/i,
    // Reklamcıların saklandığı link kısaltma servisleri
    linkKisaltma: /(bit\.ly|t\.co|lnkd\.in|goo\.gl|tinyurl\.com|shorte\.st|is\.gd|adf\.ly)\b/i,
    // Spoiler içine gizlenen linkler
    spoilerLink: /\|\|.*(http|www).*\|\|/i
};

module.exports = async (message) => {
    // 1. TEMEL KONTROLLER
    if (!message.guild || message.author.bot || message.channel.type === ChannelType.DM) return;
    
    const { client, author, channel, guild, member, content } = message;
    
    // Yetkili muafiyeti
    const yetkiliMi = member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                      member.permissions.has(PermissionsBitField.Flags.Administrator);

    // 2. İÇERİK NORMALİZASYONU (Filtre Delicileri Yakalar)
    // Örn: "s.i.k.t.i.r" -> "siktir" veya "4mk" -> "amk"
    const normalizeEdilmis = content.toLowerCase()
        .replace(/[^\w\sğüşıöç]/gi, '') 
        .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t");

    // =========================================================
    // 3. AFK SİSTEMİ (PREMIUM TASARIM)
    // =========================================================
    const afkVerisi = await AfkModel.findOne({ guildId: guild.id, userId: author.id });
    if (afkVerisi) {
        await AfkModel.deleteOne({ guildId: guild.id, userId: author.id });
        if (member.manageable) await member.setNickname(afkVerisi.oldNickname).catch(() => {});
        
        const hosgeldinEmbed = new EmbedBuilder()
            .setColor("#00d2d3")
            .setAuthor({ name: "GraveBOT | AFK Sistemi", iconURL: author.displayAvatarURL() })
            .setDescription(`🌟 **Tekrar Hoş Geldin ${author}!**\n<t:${Math.floor(afkVerisi.timestamp / 1000)}:R> başlattığın AFK modu başarıyla kapatıldı.`)
            .setFooter({ text: "GraveBOT AFK Sistemi" });

        channel.send({ embeds: [hosgeldinEmbed] }).then(m => setTimeout(() => m.delete().catch(() => {}), UYARI_SILME_SURESI));
    }

    // Etiketlenen kişi AFK mı kontrolü
    if (message.mentions.users.size > 0) {
        for (const [id, user] of message.mentions.users) {
            const data = await AfkModel.findOne({ guildId: guild.id, userId: id });
            if (data && id !== author.id) {
                const afkBilgi = new EmbedBuilder()
                    .setColor("#ff9f43")
                    .setAuthor({ name: "Kullanıcı Şu An AFK", iconURL: user.displayAvatarURL() })
                    .setDescription(`📌 **${user.username}** şu an bilgisayar başında değil.`)
                    .addFields(
                        { name: "Sebep", value: `\`${data.reason}\``, inline: true },
                        { name: "Süre", value: `<t:${Math.floor(data.timestamp / 1000)}:R>`, inline: true }
                    );
                channel.send({ embeds: [afkBilgi] }).then(m => setTimeout(() => m.delete().catch(() => {}), UYARI_SILME_SURESI));
            }
        }
    }

    // Veritabanından sunucu ayarlarını çek
    const ayarlar = await GuildSettings.findOne({ guildId: guild.id });
    if (!ayarlar) return;

    // =========================================================
    // 4. KORUMA MOTORU (MODERN SİSTEM)
    // =========================================================
    if (!yetkiliMi) {
        let ihlalVar = false;
        let ihlalNedeni = "";

        // A) KÜFÜR VE ARGO KONTROLÜ
        if (ayarlar.kufurEngel && (filtreler.kufur.test(normalizeEdilmis) || filtreler.kufur.test(content))) {
            ihlalVar = true;
            ihlalNedeni = "Küfür veya Uygunsuz Mesaj";
        }

        // B) REKLAM VE GÜVENSİZ BAĞLANTI KONTROLÜ
        if (!ihlalVar && ayarlar.reklamEngel && (filtreler.reklam.test(content) || filtreler.linkKisaltma.test(content) || filtreler.spoilerLink.test(content))) {
            ihlalVar = true;
            ihlalNedeni = "Reklam veya Şüpheli Bağlantı";
        }

        // C) CAPS LOCK KONTROLÜ
        if (!ihlalVar && ayarlar.capsEngel && content.length >= 10) {
            const buyukHarfSayisi = content.replace(/[^A-Z]/g, "").length;
            if (buyukHarfSayisi / content.length >= CAPS_LIMIT_ORANI) {
                ihlalVar = true;
                ihlalNedeni = "Aşırı Büyük Harf Kullanımı";
            }
        }

        // --- MÜDAHALE (EĞER İHLAL VARSA) ---
        if (ihlalVar) {
            await message.delete().catch(() => {});
            
            const uyariEmbed = new EmbedBuilder()
                .setColor("#ee5253")
                .setAuthor({ name: "GraveBOT | Güvenlik Sistemi", iconURL: client.user.displayAvatarURL() })
                .setDescription(`⚠️ ${author}, gönderdiğin mesaj kurallara aykırı olduğu için silindi.`)
                .addFields({ name: "Neden?", value: `\`${ihlalNedeni}\`` })
                .setFooter({ text: "Tekrarı durumunda ceza alabilirsiniz." });

            const uyariMesaj = await channel.send({ embeds: [uyariEmbed] });
            setTimeout(() => uyariMesaj.delete().catch(() => {}), UYARI_SILME_SURESI);

            // LOGLAMA SİSTEMİ
            const logKanalId = ihlalNedeni.includes("Küfür") ? ayarlar.kufurLog : ayarlar.reklamLog;
            const logKanali = guild.channels.cache.get(logKanalId);
            
            if (logKanali) {
                const logEmbed = new EmbedBuilder()
                    .setColor("#c0392b")
                    .setAuthor({ name: "Güvenlik İhlali Yakalandı", iconURL: author.displayAvatarURL() })
                    .addFields(
                        { name: "Kullanıcı", value: `${author} (\`${author.id}\`)`, inline: true },
                        { name: "Kanal", value: `${channel}`, inline: true },
                        { name: "İhlal Türü", value: `\`${ihlalNedeni}\``, inline: true },
                        { name: "Orijinal Mesaj", value: `\`\`\`${content}\`\`\`` }
                    )
                    .setTimestamp();
                logKanali.send({ embeds: [logEmbed] }).catch(() => {});
            }
            return;
        }
    }

    // =========================================================
    // 5. SELAMLAŞMA SİSTEMİ (TÜRKÇE)
    // =========================================================
    if (ayarlar.saasAktif) {
        const selamlar = ["sa", "selam", "sea", "selamün aleyküm", "selamun aleyküm", "merhaba", "slm"];
        if (selamlar.includes(normalizeEdilmis.trim())) {
            const cevapEmbed = new EmbedBuilder()
                .setColor("#1dd1a1")
                .setDescription(`🌿 **Aleyküm Selam ${author}, Sunucumuza Hoş Geldin!**`)
                .setTimestamp();
            message.reply({ embeds: [cevapEmbed] }).catch(() => {});
        }
    }
};
