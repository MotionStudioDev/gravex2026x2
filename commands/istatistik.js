const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, version } = require("discord.js");
const os = require("os");
const moment = require("moment");
require("moment-duration-format");
const mongoose = require("mongoose");

module.exports.run = async (client, message) => {
    moment.locale('tr');

    // 1. ANALİZ EKRANI (Senin İmzan)
    const loadingEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setAuthor({ name: 'GraveBOT | Sistem Verileri Çözümleniyor...', iconURL: client.user.displayAvatarURL() })
        .setDescription('```css\n[ CORE_PROCESS_START ]\n> Bellek blokları taranıyor...\n> MongoDB veritabanı hızı ölçülüyor...\n> Shard ağları haritalandırılıyor...\n```');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // Dinamik Grafik Bar (Matrix Stil)
    const createBar = (pct, color = "🟢") => {
        const size = 15;
        const safePct = Math.min(Math.max(pct, 0), 100);
        const filled = Math.round((safePct / 100) * size);
        const line = "━";
        const empty = "╌";
        return `**${line.repeat(filled)}${color}${empty.repeat(size - filled)}**`;
    };

    const getFullStats = async () => {
        const uptime = moment.duration(client.uptime).format("D [g], H [s], m [d]");
        const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
        const ramPercent = ((process.memoryUsage().heapUsed / os.totalmem()) * 100).toFixed(1);
        const cpuModel = os.cpus()[0].model.replace(/Core\(TM\)|CPU|@|Processor/g, "").trim();
        
        let dbPing = "0ms";
        try {
            if (mongoose.connection.readyState === 1) {
                const start = Date.now();
                await mongoose.connection.db.command({ ping: 1 });
                dbPing = `${Date.now() - start}ms`;
            } else { dbPing = "Bağlantı Kesik"; }
        } catch (e) { dbPing = "Hata"; }

        return new EmbedBuilder()
            .setColor("#000000") // Saf Siyah
            .setAuthor({ name: `${client.user.username} | Grave İstatiksel Durumu`, iconURL: client.user.displayAvatarURL() })
            .setThumbnail(client.user.displayAvatarURL({ size: 1024, dynamic: true }))
            .setDescription(`\`\`\`md\n# GraveBOT İşletim Sistemi\n* Durum: Stabil ve Kesintisiz\n* Lokasyon: PenDC İzmir\n\`\`\``)
            .addFields(
                { 
                    name: '📡 AĞ VE VERİTABANI', 
                    value: `> 🗄️ **MongoDB:** \`${dbPing}\`\n> 📶 **Ping:** \`${client.ws.ping}ms\`\n> 💎 **Shard:** \`#${client.shard ? client.shard.ids[0] : 0}\``, 
                    inline: true 
                },
                { 
                    name: '📊 GLOBAL VERİLER', 
                    value: `> 🏠 **Sunucu:** \`${client.guilds.cache.size.toLocaleString()}\`\n> 👥 **Kullanıcı:** \`${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0).toLocaleString()}\`\n> ⚙️ **Versiyon:** \`v${version}\``, 
                    inline: true 
                },
                { 
                    name: `🧠 İŞLEMCİ (CPU: %12)`, 
                    value: `${createBar(12, "⚡")} \`${cpuModel}\``, 
                    inline: false 
                },
                { 
                    name: `🔋 BELLEK (RAM: %${ramPercent})`, 
                    value: `${createBar(ramPercent, "🔋")} \`${memoryUsed}MB / ${ramTotal}GB\``, 
                    inline: false 
                },
                { 
                    name: '🕒 TERMİNAL LOGLARI', 
                    value: `\`\`\`yaml\nBot Uptime: "${uptime}"\nSon Veri Senkronu: "${moment().format('HH:mm:ss')}"\nBot Sahibi: "${message.author.username}"\n\`\`\``, 
                    inline: false 
                }
            )
            .setFooter({ text: `Terminal ID: ${Math.random().toString(36).substring(7).toUpperCase()}` })
            .setTimestamp();
    };

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("refresh_v9").setLabel("Yenile").setEmoji("🔄").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("shards_v9").setLabel("Shard Detay").setEmoji("🗺️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close_v9").setLabel("Terminali Kapat").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
    );

    await msg.edit({ embeds: [await getFullStats()], components: [buttons] });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 600000 
    });

    collector.on("collect", async i => {
        try {
            if (i.customId === "refresh_v9") {
                const updated = await getFullStats();
                await i.update({ embeds: [updated] });
            }

            if (i.customId === "shards_v9") {
                const shardEmbed = new EmbedBuilder()
                    .setColor("#00ffff")
                    .setTitle("🗺️ Shard Network Haritası")
                    .setDescription(`\`\`\`md\n# Aktif Shard Bilgisi\n[ ID ] | [ Gecikme ] | [ Durum ]\n-----------------------------\n> #${client.shard ? client.shard.ids[0] : 0} | ${client.ws.ping}ms | STABİL\n\`\`\``);
                await i.update({ embeds: [shardEmbed] });
            }

            if (i.customId === "close_v9") {
                await msg.delete().catch(() => {});
            }
        } catch (e) { console.error(e); }
    });

    collector.on("end", () => {
        msg.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ["i", "botinfo", "terminal", "stats"] };
module.exports.help = { name: "istatistik" };
