const client = require("../main");
const { Collection, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const db = require("orio.db");
const Reminder = require("../models/Reminder");

// Bot yeniden başlatılıyor mesajı
console.log("🔄 Bot yeniden başlatılıyor... Lütfen bekleyin.");

client.on("ready", async () => {
    console.clear();
    console.log("✅ Bot başarıyla aktif oldu!");
    console.log(`📛 Kullanıcı: ${client.user.tag}`);
    console.log(`🆔 ID: ${client.user.id}`);
    console.log(`🌍 Sunucu Sayısı: ${client.guilds.cache.size}`);
    console.log(`📶 Ping: ${client.ws.ping}ms`);
    console.log("────────────────────────────────────────");

    // Komutları yükle
    client.commands = new Collection();
    client.aliases = new Collection();
    
    console.log("📁 Komutlar yükleniyor...");
    fs.readdir("./commands/", (err, files) => {
        if (err) return console.error("❌ Komutlar yüklenirken hata oluştu:", err);
        
        const jsFiles = files.filter(f => f.endsWith(".js"));
        console.log(`📂 Klasörde ${jsFiles.length} komut dosyası bulundu.`);

        jsFiles.forEach(f => {
            try {
                const props = require(`../commands/${f}`);
                
                // Komut adını ve varsa aliaslarını yükle
                if (props.help && props.help.name) {
                    client.commands.set(props.help.name, props);
                    console.log(`✔ ${props.help.name} komutu başarıyla yüklendi.`);
                    
                    if (props.conf && props.conf.aliases) {
                        props.conf.aliases.forEach(alias => {
                            client.aliases.set(alias, props.help.name);
                        });
                    }
                } else {
                    console.warn(`⚠ ${f} dosyası düzgün bir komut yapısına sahip değil (help.name eksik).`);
                }
            } catch (error) {
                console.error(`❌ ${f} yüklenirken bir hata oluştu:`, error.message);
            }
        });
        console.log("────────────────────────────────────────");
    });

    // Rastgele activity mesajları
    const activities = [
        `g!yardım | ${client.guilds.cache.size} sunucu!`,
        `g!davet | v2.0.0`,
        `g!deprem - 7/24 Depremleri İzle`,
        `g!yapayzeka - Yapay Zeka ile konuş`
    ];

    setInterval(() => {
        const activity = activities[Math.floor(Math.random() * activities.length)];
        client.user.setActivity(activity, { type: 3 }); 
    }, 10000);

    client.user.setStatus("dnd");

    // Log kanalına mesaj gönder
    const logChannelId = "1416144862050259168"; 
    if (logChannelId) {
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
            const startEmbed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("🟢 Bot Yeniden Başlatıldı")
                .setDescription([
                    `**Bot:** ${client.user.tag}`,
                    `**Komut Sayısı:** ${client.commands.size}`,
                    `**Ping:** ${client.ws.ping}ms`
                ].join("\n"))
                .setTimestamp();
            logChannel.send({ embeds: [startEmbed] }).catch(() => {});
        }
    }

    // Hatırlatma sistemi
    setInterval(async () => {
        try {
            const now = new Date();
            const reminders = await Reminder.find({ status: "active", remindAt: { $lte: now } });
            
            for (const r of reminders) {
                const user = await client.users.fetch(r.userId).catch(() => null);
                if (user) {
                    const reminderEmbed = new EmbedBuilder()
                        .setColor("Yellow")
                        .setTitle("⏰ Hatırlatma Zamanı!")
                        .setDescription(`**Mesaj:** ${r.message}`)
                        .setFooter({ text: "Grave Hatırlatma" });

                    await user.send({ embeds: [reminderEmbed] }).catch(() => {});
                }
                r.status = "done";
                await r.save();
            }
        } catch (err) {
            console.error("Hatırlatma hatası:", err);
        }
    }, 60000);
});
