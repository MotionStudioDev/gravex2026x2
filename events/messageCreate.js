const { EmbedBuilder, PermissionsBitField, ChannelType, Collection } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const AfkModel = require("../models/Afk");
const SpamLog = require("../models/SpamLog"); 
const moment = require("moment");
require("moment/locale/tr");

const UYARI_SURESI = 7000;
const CAPS_ORAN = 0.70;
const mesajTakip = new Collection(); 

function sentinelAnaliz(text) {
    if (!text) return { ihlal: false };
    let ham = text.toLowerCase()
        .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
        .replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/9/g, "g");
    const temiz = ham.replace(/[^\w\sğüşıöç]/gi, '').replace(/\s+/g, '');
    const sadelesmis = temiz.replace(/(.)\1+/g, '$1');
    const karaListe = ['amk', 'amq', 'ananı', 'orospu', 'oç', 'oc', 'piç', 'pıç', 'yarrak', 'yarak', 'sik', 'sık', 'göt', 'salak', 'aptal', 'gerizekalı', 'ibne', 'siktir', 'sikik', 'amına', 'amcık', 'daşşak', 'taşşak', 'fahişe', 'kahpe', 'yavşak', 'gevşek', 'pezevenk', 'şerefsiz', 'puşt', 'gavat', 'dalyarak'];

    const yakalandiMi = karaListe.some(yasak => {
        const regex = new RegExp(`(^|\\s|[^a-zğüşıöç])${yasak}([^a-zğüşıöç]|\\s|$)`, 'i');
        return regex.test(ham) || temiz.includes(yasak) || sadelesmis.includes(yasak);
    });
    return { ihlal: yakalandiMi, tespit: yakalandiMi ? "Küfür/Uygunsuz İçerik" : null };
}

module.exports = async (message) => {
    if (!message.guild || message.author.bot || message.channel.type === ChannelType.DM) return;
    
    const { client, author, channel, guild, member, content } = message;
    const ayarlar = await GuildSettings.findOne({ guildId: guild.id });
    if (!ayarlar) return;

    const yetkili = member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
                   member.permissions.has(PermissionsBitField.Flags.Administrator);

    // =========================================================
    // 0. EVERYONE/HERE ENGEL SİSTEMİ (YENİ ENTEGRE)
    // =========================================================
    if (ayarlar.everyoneEngel) {
        const beyazListedeMi = ayarlar.everyoneWhitelist?.includes(author.id) || 
                              member.roles.cache.some(r => ayarlar.everyoneWhitelist?.includes(r.id)) ||
                              yetkili;

        if (!beyazListedeMi && (content.includes('@everyone') || content.includes('@here'))) {
            await message.delete().catch(() => {});
            
            let cezaMetni = "Uyarıldı ⚠️";
            try {
                if (ayarlar.everyoneCeza === 'timeout') {
                    await member.timeout(10 * 60 * 1000, "GraveOS: Everyone/Here Yasaklı Etiket");
                    cezaMetni = "10 Dakika Susturuldu ⏳";
                } else if (ayarlar.everyoneCeza === 'kick') {
                    await member.kick("GraveOS: Everyone/Here Yasaklı Etiket");
                    cezaMetni = "Sunucudan Atıldı 👢";
                } else if (ayarlar.everyoneCeza === 'ban') {
                    await member.ban({ reason: "GraveOS: Everyone/Here Yasaklı Etiket" });
                    cezaMetni = "Sunucudan Yasaklandı 🔨";
                }
            } catch (e) { cezaMetni = "Yetki Yetersiz (Ceza Uygulanamadı)"; }

            const alert = new EmbedBuilder()
                .setColor("#ED4245")
                .setAuthor({ name: "GraveOS Güvenlik", iconURL: author.displayAvatarURL() })
                .setDescription(`${author}, bu sunucuda izinsiz etiket atmak yasaktır!\n\n🛡️ **İşlem:** \`${cezaMetni}\``);
            
            channel.send({ embeds: [alert] }).then(m => setTimeout(() => m.delete().catch(() => {}), UYARI_SURESI));

            const logKanal = guild.channels.cache.get(ayarlar.everyoneLog);
            if (logKanal) {
                logKanal.send({ embeds: [new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle("🚨 Yasaklı Etiket Kullanımı")
                    .addFields(
                        { name: "Kullanıcı", value: `${author} (\`${author.id}\`)`, inline: true },
                        { name: "Ceza", value: `\`${cezaMetni}\``, inline: true },
                        { name: "Mesaj", value: `\`\`\`${content}\`\`\`` }
                    ).setTimestamp()] }).catch(() => {});
            }
            return; // Etiket yakalandıysa diğer kontrollere gerek yok
        }
    }

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
        channel.send({ embeds: [welcome] }).then(m => setTimeout(() => m.delete().catch(() => {}), UYARI_SURESI));
    }

    if (message.mentions.users.size > 0) {
        for (const [id, user] of message.mentions.users) {
            const data = await AfkModel.findOne({ guildId: guild.id, userId: id });
            if (data && id !== author.id) {
                const info = new EmbedBuilder()
                    .setColor("#f39c12")
                    .setAuthor({ name: "Kullanıcı Müsait Değil", iconURL: user.displayAvatarURL() })
                    .setDescription(`🛑 **${user.username}** şu anda AFK.\n**Sebep:** \`${data.reason}\``);
                channel.send({ embeds: [info] }).then(m => setTimeout(() => m.delete().catch(() => {}), UYARI_SURESI));
            }
        }
    }

    // =========================================================
    // 2. ULTRA MEGA SPAM KORUMASI
    // =========================================================
    if (!yetkili && ayarlar.spamSistemi) {
        const simdi = Date.now();
        let userMessages = mesajTakip.get(author.id) || [];
        userMessages.push(simdi);
        const sonMesajlar = userMessages.filter(t => simdi - t < 3000);
        mesajTakip.set(author.id, sonMesajlar);

        if (sonMesajlar.length >= 5) {
            await message.delete().catch(() => {});
            let sabika = await SpamLog.findOne({ guildId: guild.id, userId: author.id });
            if (!sabika) sabika = new SpamLog({ guildId: guild.id, userId: author.id, ihlalSayisi: 0 });

            sabika.ihlalSayisi += 1;
            await sabika.save();

            const logKanal = guild.channels.cache.get(ayarlar.spamLogKanali);
            if (sabika.ihlalSayisi === 1) {
                try {
                    await member.timeout(10 * 60 * 1000, "Spam Koruması: 1. Uyarı");
                    channel.send(`🚨 ${author}, spam yaptığın için **10 dakika** susturuldun. (1/2)`);
                    if (logKanal) logKanal.send({ embeds: [new EmbedBuilder().setColor('Orange').setTitle('Spam İhlali: Kademe 1').setDescription(`${author} susturuldu.`)] });
                } catch (e) {}
                return;
            } else if (sabika.ihlalSayisi >= 2) {
                try {
                    await author.send({ content: `**${guild.name}** sunucusunda spam nedeniyle yasaklandınız.` }).catch(() => {});
                    await member.ban({ reason: 'Spam Koruması: 2. İhlal' });
                    channel.send(`🚫 ${author} spam nedeniyle sunucudan **BANLANDI!**`);
                    await SpamLog.deleteOne({ guildId: guild.id, userId: author.id });
                } catch (e) {}
                return;
            }
        }
    }

    // =========================================================
    // 3. KÜFÜR, REKLAM VE CAPS KORUMASI
    // =========================================================
    if (!yetkili) {
        let ihlalTuru = null;

        if (ayarlar.kufurEngel) {
            const analiz = sentinelAnaliz(content);
            if (analiz.ihlal) ihlalTuru = analiz.tespit;
        }

        const reklamRegex = /(discord\.(gg|io|me|li|club)\/.+|https?:\/\/\S+|www\.\S+|\.com\b|\.net\b|\.org\b|\.xyz\b)/i;
        if (!ihlalTuru && ayarlar.reklamEngel && reklamRegex.test(content)) {
            ihlalTuru = "Reklam veya Yasaklı Link";
        }

        if (!ihlalTuru && ayarlar.capsEngel && content.length >= 10) {
            const buyukHarf = content.replace(/[^A-Z]/g, "").length;
            if (buyukHarf / content.length >= CAPS_ORAN) ihlalTuru = "Aşırı Caps Lock";
        }

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

            const logId = ihlalTuru.includes("Küfür") ? ayarlar.kufurLog : ayarlar.reklamLog;
            const logKanal = guild.channels.cache.get(logId);
            if (logKanal) {
                logKanal.send({ embeds: [new EmbedBuilder().setColor("#1a1a1a").setTitle("🛡️ Güvenlik Logu").addFields({ name: "Kullanıcı", value: `${author}`, inline: true }, { name: "İşlem", value: `\`${ihlalTuru}\``, inline: true }, { name: "Mesaj", value: `\`\`\`${content}\`\`\`` }).setTimestamp()] }).catch(() => {});
            }
            return;
        }
    }

    // =========================================================
    // 4. SA-AS SİSTEMİ
    // =========================================================
    if (ayarlar.saasAktif) {
        const selamlar = ["sa", "selam", "sea", "selamun aleyküm", "merhaba", "slm"];
        const normalize = content.toLowerCase().replace(/[^\w\sğüşıöç]/gi, '').trim();
        if (selamlar.includes(normalize)) {
            message.reply({ embeds: [new EmbedBuilder().setColor("#3498db").setDescription(`👋 **Aleyküm Selam ${author}, hoş geldin!**`)] }).catch(() => {});
        }
    }
};
