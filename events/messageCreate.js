const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const AfkModel = require("../models/Afk");
const moment = require("moment");
require("moment/locale/tr");

// --- SİSTEM AYARLARI ---
const UYARI_SURESİ = 7000;
const CAPS_ORAN = 0.70;

/**
 * @title Gelişmiş Filtreleme Algoritması (Apex Engine)
 * @description Harf uzatmalarını, özel karakterleri ve sinsi boşlukları analiz eder.
 */
function sentinelAnaliz(text) {
    if (!text) return { ihlal: false };

    // 1. Aşama: Ham içerik temizliği (Leet Speak Dönüşümü)
    let ham = text.toLowerCase()
        .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
        .replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/9/g, "g");

    // 2. Aşama: Karakter Temizliği (Noktalama ve görünmez karakterleri siler)
    const temiz = ham.replace(/[^\w\sğüşıöç]/gi, '').replace(/\s+/g, '');

    // 3. Aşama: Harf Tekrarlarını Teke İndirme (oooooç -> oç | piiiiiççç -> piç)
    const sadelesmis = temiz.replace(/(.)\1+/g, '$1');

    // 4. Aşama: Yasaklı Kelime Veritabanı (Genişletilmiş)
    const karaListe = [
        'amk', 'amq', 'ananı', 'orospu', 'oç', 'oc', 'piç', 'pıç', 'yarrak', 'yarak', 'sik', 'sık', 
        'göt', 'salak', 'aptal', 'gerizekalı', 'ibne', 'siktir', 'sikik', 'amına', 'amcık', 
        'daşşak', 'taşşak', 'fahişe', 'kahpe', 'yavşak', 'gevşek', 'pezevenk', 'şerefsiz',
        'puşt', 'gavat', 'dalyarak', 'amın feryadı', 'amın evladı', 'kahpenin evladı'
    ];

    // Kontrol: Kelime bazlı, temizlenmiş bazlı ve sadeleşmiş bazlı tarama
    const yakalandı mı = karaListe.some(yasak => {
        const regex = new RegExp(`(^|\\s|[^a-zğüşıöç])${yasak}([^a-zğüşıöç]|\\s|$)`, 'i');
        return regex.test(ham) || temiz.includes(yasak) || sadelesmis.includes(yasak);
    });

    return { ihlal: yakalandı mı, tespit: yakalandı mı ? "Küfür/Uygunsuz İçerik" : null };
}

module.exports = async (message) => {
    // --- ÖN KONTROLLER ---
    if (!message.guild || message.author.bot || message.channel.type === ChannelType.DM) return;
    
    const { client, author, channel, guild, member, content } = message;
    const yetkili = member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                   member.permissions.has(PermissionsBitField.Flags.Administrator);

    // =========================================================
    // 1. AFK SİSTEMİ (GELİŞMİŞ UI)
    // =========================================================
    const afkData = await AfkModel.findOne({ guildId: guild.id, userId: author.id });
    if (afkData) {
        await AfkModel.deleteOne({ guildId: guild.id, userId: author.id });
        if (member.manageable) await member.setNickname(afkData.oldNickname).catch(() => {});
        
        const welcome = new EmbedBuilder()
            .setColor("#27ae60")
            .setAuthor({ name: "GraveBOT | Güvenli Dönüş", iconURL: author.displayAvatarURL() })
            .setDescription(`👋 **Tekrar Hoş Geldin!** AFK modun başarıyla devre dışı bırakıldı.\n**Süre:** <t:${Math.floor(afkData.timestamp / 1000)}:R>`)
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
                    .setAuthor({ name: "Kullanıcı Meşgul", iconURL: user.displayAvatarURL() })
                    .setDescription(`🛑 **${user.username}** şu anda AFK modunda.\n**Sebep:** \`${data.reason}\``)
                    .setFooter({ text: "GraveBOT AFK Bildirimi" });
                channel.send({ embeds: [info] }).then(m => setTimeout(() => m.delete().catch(() => {}), UYARI_SURESİ));
            }
        }
    }

    const ayarlar = await GuildSettings.findOne({ guildId: guild.id });
    if (!ayarlar) return;

    // =========================================================
    // 2. MODERASYON MOTORU (APEX SENTINEL)
    // =========================================================
    if (!yetkili) {
        let ihlal = null;

        // A) KÜFÜR ANALİZİ
        if (ayarlar.kufurEngel) {
            const analiz = sentinelAnaliz(content);
            if (analiz.ihlal) ihlal = analiz.tespit;
        }

        // B) REKLAM & LİNK KONTROLÜ
        const reklamRegex = /(discord\.(gg|io|me|li|club)\/.+|https?:\/\/\S+|www\.\S+|\.com\b|\.net\b|\.org\b|\.xyz\b|\.pw\b|\.tk\b)/i;
        if (!ihlal && ayarlar.reklamEngel && reklamRegex.test(content)) {
            ihlal = "Reklam veya Yasaklı Bağlantı";
        }

        // C) CAPS LOCK KONTROLÜ
        if (!ihlal && ayarlar.capsEngel && content.length >= 10) {
            const buyukHarf = content.replace(/[^A-Z]/g, "").length;
            if (buyukHarf / content.length >= CAPS_ORAN) {
                ihlal = "Aşırı Büyük Harf (Caps)";
            }
        }

        // --- İHLAL DURUMUNDA AKSİYON ---
        if (ihlal) {
            await message.delete().catch(() => {});
            
            const alert = new EmbedBuilder()
                .setColor("#c0392b")
                .setAuthor({ name: "GraveBOT Güvenlik Birimi", iconURL: client.user.displayAvatarURL() })
                .setTitle("🚨 Erişim Engellendi")
                .setDescription(`${author}, gönderdiğin içerik sunucu kurallarını ihlal ediyor.`)
                .addFields({ name: "Neden?", value: `\`${ihlal}\`` })
                .setFooter({ text: "İşlemleriniz kayıt altına alınıyor." });

            const msg = await channel.send({ embeds: [alert] });
            setTimeout(() => msg.delete().catch(() => {}), UYARI_SURESİ);

            // LOG SİSTEMİ
            const logId = ihlal.includes("Küfür") ? ayarlar.kufurLog : ayarlar.reklamLog;
            const logKanali = guild.channels.cache.get(logId);
            if (logKanali) {
                const logEmbed = new EmbedBuilder()
                    .setColor("#1a1a1a")
                    .setTitle("🛡️ Sentinel Müdahale Kaydı")
                    .addFields(
                        { name: "Kullanıcı", value: `${author} (\`${author.id}\`)`, inline: true },
                        { name: "Kanal", value: `${channel}`, inline: true },
                        { name: "Tespit", value: `\`${ihlal}\``, inline: true },
                        { name: "Mesaj", value: `\`\`\`${content}\`\`\`` }
                    ).setTimestamp();
                logKanali.send({ embeds: [logEmbed] }).catch(() => {});
            }
            return;
        }
    }

    // =========================================================
    // 3. AKILLI SELAMLAŞMA (SA-AS)
    // =========================================================
    if (ayarlar.saasAktif) {
        const selamlar = ["sa", "selam", "sea", "selamun aleyküm", "merhaba", "slm", "selamlar"];
        const normalizeSelam = content.toLowerCase().replace(/[^\w\sğüşıöç]/gi, '').trim();
        
        if (selamlar.includes(normalizeSelam)) {
            const response = new EmbedBuilder()
                .setColor("#3498db")
                .setDescription(`👋 **Aleyküm Selam ${author}, Sunucumuza Hoş Geldin!**\nNasılsın, her şey yolunda mı?`);
            message.reply({ embeds: [response] }).catch(() => {});
        }
    }
};
