const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const AfkModel = require("../models/Afk");
const moment = require("moment");
require("moment/locale/tr");

// --- AYARLAR ---
const UYARI_SURESI = 7000;
const CAPS_ORAN = 0.70;

/**
 * Gelişmiş Filtreleme Algoritması (Apex Engine)
 * Boşlukları, harf uzatmalarını ve özel karakterleri temizleyip analiz eder.
 */
function sentinelAnaliz(text) {
    if (!text) return { ihlal: false };

    // 1. Leet Speak ve Benzer Karakter Dönüşümü
    let ham = text.toLowerCase()
        .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
        .replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/9/g, "g");

    // 2. Karakter Temizliği (Noktalama ve sinsi boşlukları siler)
    const temiz = ham.replace(/[^\w\sğüşıöç]/gi, '').replace(/\s+/g, '');

    // 3. Harf Tekrarlarını Teke İndirme (oooooç -> oç)
    const sadelesmis = temiz.replace(/(.)\1+/g, '$1');

    // 4. Yasaklı Kelime Veritabanı
    const karaListe = [
        'amk', 'amq', 'ananı', 'orospu', 'oç', 'oc', 'piç', 'pıç', 'yarrak', 'yarak', 'sik', 'sık', 
        'göt', 'salak', 'aptal', 'gerizekalı', 'ibne', 'siktir', 'sikik', 'amına', 'amcık', 
        'daşşak', 'taşşak', 'fahişe', 'kahpe', 'yavşak', 'gevşek', 'pezevenk', 'şerefsiz',
        'puşt', 'gavat', 'dalyarak'
    ];

    // Hata düzeltildi: Boşluk kaldırıldı, değişken ismi "yakalandiMi" yapıldı.
    const yakalandiMi = karaListe.some(yasak => {
        const regex = new RegExp(`(^|\\s|[^a-zğüşıöç])${yasak}([^a-zğüşıöç]|\\s|$)`, 'i');
        return regex.test(ham) || temiz.includes(yasak) || sadelesmis.includes(yasak);
    });

    return { ihlal: yakalandiMi, tespit: yakalandiMi ? "Küfür/Uygunsuz İçerik" : null };
}

module.exports = async (message) => {
    // TEMEL KONTROLLER
    if (!message.guild || message.author.bot || message.channel.type === ChannelType.DM) return;
    
    const { client, author, channel, guild, member, content } = message;
    const yetkili = member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                   member.permissions.has(PermissionsBitField.Flags.Administrator);

    // =========================================================
    // 1. AFK SİSTEMİ
    // =========================================================
    const afkData = await AfkModel.findOne({ guildId: guild.id, userId: author.id });
    if (afkData) {
        await AfkModel.deleteOne({ guildId: guild.id, userId: author.id });
        if (member.manageable) await member.setNickname(afkData.oldNickname).catch(() => {});
        
        const welcome = new EmbedBuilder()
            .setColor("#27ae60")
            .setAuthor({ name: "GraveOS | AFK Sistemi", iconURL: author.displayAvatarURL() })
            .setDescription(`👋 **Tekrar Hoş Geldin!** AFK modun sonlandırıldı.\n**Süre:** <t:${Math.floor(afkData.timestamp / 1000)}:R>`)
            .setTimestamp();

        channel.send({ embeds: [welcome] }).then(m => setTimeout(() => m.delete().catch(() => {}), UYARI_SURESİ));
    }

    // Etiket AFK Kontrolü
    if (message.mentions.users.size > 0) {
        for (const [id, user] of message.mentions.users) {
            const data = await AfkModel.findOne({ guildId: guild.id, userId: id });
            if (data && id !== author.id) {
                const info = new EmbedBuilder()
                    .setColor("#f39c12")
                    .setAuthor({ name: "Kullanıcı Müsait Değil", iconURL: user.displayAvatarURL() })
                    .setDescription(`🛑 **${user.username}** şu anda AFK.\n**Sebep:** \`${data.reason}\``);
                channel.send({ embeds: [info] }).then(m => setTimeout(() => m.delete().catch(() => {}), UYARI_SURESİ));
            }
        }
    }

    // Ayarları Çek
    const ayarlar = await GuildSettings.findOne({ guildId: guild.id });
    if (!ayarlar) return;

    // =========================================================
    // 2. KORUMA SİSTEMİ
    // =========================================================
    if (!yetkili) {
        let ihlalTuru = null;

        // KÜFÜR ANALİZİ
        if (ayarlar.kufurEngel) {
            const analiz = sentinelAnaliz(content);
            if (analiz.ihlal) ihlalTuru = analiz.tespit;
        }

        // REKLAM KONTROLÜ
        const reklamRegex = /(discord\.(gg|io|me|li|club)\/.+|https?:\/\/\S+|www\.\S+|\.com\b|\.net\b|\.org\b|\.xyz\b)/i;
        if (!ihlalTuru && ayarlar.reklamEngel && reklamRegex.test(content)) {
            ihlalTuru = "Reklam veya Yasaklı Link";
        }

        // CAPS LOCK KONTROLÜ
        if (!ihlalTuru && ayarlar.capsEngel && content.length >= 10) {
            const buyukHarf = content.replace(/[^A-Z]/g, "").length;
            if (buyukHarf / content.length >= CAPS_ORAN) {
                ihlalTuru = "Aşırı Caps Lock";
            }
        }

        // AKSİYON
        if (ihlalTuru) {
            await message.delete().catch(() => {});
            
            const alert = new EmbedBuilder()
                .setColor("#c0392b")
                .setTitle("🚨 GraveOS Güvenlik Engeli")
                .setDescription(`${author}, gönderdiğin içerik kurallara aykırı bulundu.`)
                .addFields({ name: "Sebep", value: `\`${ihlalTuru}\`` })
                .setFooter({ text: "GraveOS Koruma Motoru" });

            const msg = await channel.send({ embeds: [alert] });
            setTimeout(() => msg.delete().catch(() => {}), UYARI_SURESI);

            // LOG
            const logId = ihlalTuru.includes("Küfür") ? ayarlar.kufurLog : ayarlar.reklamLog;
            const logKanal = guild.channels.cache.get(logId);
            if (logKanal) {
                logKanal.send({ embeds: [
                    new EmbedBuilder()
                        .setColor("#1a1a1a")
                        .setTitle("🛡️ Güvenlik Logu")
                        .addFields(
                            { name: "Kullanıcı", value: `${author} (\`${author.id}\`)`, inline: true },
                            { name: "İşlem", value: `\`${ihlalTuru}\``, inline: true },
                            { name: "Mesaj", value: `\`\`\`${content}\`\`\`` }
                        ).setTimestamp()
                ]}).catch(() => {});
            }
            return;
        }
    }

    // =========================================================
    // 3. SA-AS SİSTEMİ
    // =========================================================
    if (ayarlar.saasAktif) {
        const selamlar = ["sa", "selam", "sea", "selamun aleyküm", "merhaba", "slm"];
        const normalize = content.toLowerCase().replace(/[^\w\sğüşıöç]/gi, '').trim();
        
        if (selamlar.includes(normalize)) {
            message.reply({ embeds: [
                new EmbedBuilder().setColor("#3498db").setDescription(`👋 **Aleyküm Selam ${author}, hoş geldin!**`)
            ]}).catch(() => {});
        }
    }
};
