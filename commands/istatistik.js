const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const os = require("os");
const moment = require("moment");
require("moment-duration-format");

// Türkiye Yerel Ayarlarını Ayarlama (Uptime için)
moment.locale('tr'); 

module.exports.run = async (client, message) => {
    const generateEmbed = async () => {
        // Shardlı Gerçek Sunucu ve Kullanıcı Sayısı Hesaplama
        let totalGuilds;
        let totalUsers;
        if (client.shard) {
            try {
                const guildResults = await client.shard.broadcastEval(c => c.guilds.cache.size);
                totalGuilds = guildResults.reduce((acc, val) => acc + val, 0);

                const userResults = await client.shard.broadcastEval(c =>
                    c.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)
                );
                totalUsers = userResults.reduce((acc, val) => acc + val, 0);
            } catch {
                totalGuilds = "Bilinmiyor";
                totalUsers = "Bilinmiyor";
            }
        } else {
            totalGuilds = client.guilds.cache.size;
            totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        }

        // Veri Hesaplamaları
        const botUptime = moment.duration(client.uptime).format("D [gün], H [saat], m [dakika], s [saniye]");
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const apiPing = Math.round(client.ws.ping);
        const osUptime = moment.duration(os.uptime() * 1000).format("D [gün], H [saat], m [dakika]");
        const cpuModel = os.cpus()[0].model;
        const platform = os.platform().replace(/win32/i, "Windows").replace(/linux/i, "Linux");
        const arch = os.arch().toUpperCase(); // Mimari (win32, x64 gibi)

        // EK BİLGİ: Discord.js versiyonunu direkt require'dan alalım (daha stabil)
        const djsVersion = require("discord.js").version;

        return new EmbedBuilder()
            .setColor("Blurple")
            .setAuthor({
                name: `${client.user.username} | Bot İstatistikleri`,
                iconURL: client.user.displayAvatarURL({ dynamic: true })
            })
            // --- BOT BİLGİLERİ ---
            .addFields(
                { name: "🤖 Bot Durumu", value: "**▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬**", inline: false },
                { name: "🏠 Sunucular", value: `${totalGuilds}`, inline: true },
                { name: "👥 Kullanıcılar", value: `${totalUsers}`, inline: true },
                { name: "🔗 Shard", value: client.shard ? `Shard ${client.shard.ids[0] + 1}/${client.shard.count}` : "Tek Parça", inline: true },
                
                { name: "💾 RAM Kullanımı", value: `${memoryUsage} MB`, inline: true },
                { name: "📶 API Pingi", value: `${apiPing} ms`, inline: true },
                { name: "⏳ Bot Uptime", value: botUptime, inline: true },

                { name: "\u200B", value: "\u200B", inline: false }, // Boşluk
                
                // --- HOST BİLGİLERİ ---
                { name: "💻 Host Bilgileri", value: "**▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬**", inline: false },
                { name: "⚙️ CPU Modeli", value: `\`${cpuModel}\``, inline: false },

                { name: "🌐 Sistem", value: `\`${platform} | ${arch}\``, inline: true },
                { name: "⏱️ Sistem Uptime", value: osUptime, inline: true },
                
                { name: "\u200B", value: "\u200B", inline: false }, // Boşluk
                
                // --- TEKNİK SÜRÜMLER ---
                { name: "📚 Discord.JS", value: `v${djsVersion}`, inline: true },
                { name: "🟢 Node.JS", value: `v${process.version}`, inline: true }
            )
            .setFooter({ text: `Son Güncelleme: ${new Date().toLocaleTimeString('tr-TR')}` });
    };

    // Buton satırı
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("yenile")
            .setLabel("🔄 Verileri Yenile")
            .setStyle(ButtonStyle.Primary)
    );

    // İlk gönderim
    const msg = await message.channel.send({ embeds: [await generateEmbed()], components: [row] });

    // Collector (60 saniye boyunca butonu dinler)
    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 60000
    });

    collector.on("collect", async i => {
        if (i.customId === "yenile") {
            // Butona basıldığında Embed'i günceller
            await i.update({ embeds: [await generateEmbed()], components: [row] });
        }
    });

    collector.on("end", async () => {
        try {
            // Süre bitince butonu devre dışı bırakır
            const disabledRow = new ActionRowBuilder().addComponents(
                row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
            );
            await msg.edit({ components: [disabledRow] });
        } catch {}
    });
};

module.exports.conf = { aliases: ["botbilgi", "bilgi"] };
module.exports.help = { name: "istatistik" };
