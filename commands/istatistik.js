const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const os = require("os");
const moment = require("moment");
require("moment-duration-format");

module.exports.run = async (client, message) => {
  const generateEmbed = async () => {
    // Bot Uptime (Çalışma Süresi)
    const uptime = moment
      .duration(client.uptime)
      .format("D [gün], H [saat], m [dakika], s [saniye]");

    // Bellek Kullanımı
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const apiPing = Math.round(client.ws.ping);

    // Shardlı Gerçek Sunucu ve Kullanıcı Sayısı (Mevcut kodunuzdan alındı)
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

    // --- YENİ EKLENEN SİSTEM BİLGİLERİ ---
    
    // İşletim Sistemi Uptime
    const osUptime = moment.duration(os.uptime() * 1000).format("D [gün], H [saat], m [dakika]");
    
    // CPU Modeli
    const cpuModel = os.cpus()[0].model;
    
    // Platform (İşletim Sistemi)
    const platform = os.platform().replace(/win32/i, "Windows").replace(/linux/i, "Linux");

    return new EmbedBuilder()
      .setColor("Blurple")
      .setTitle(`🤖 GraveBOT | Güncel İstatistikler`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true })) // Bot avatarı eklendi
      .addFields(
          // --- BİRİNCİL VERİLER (PERFORMANS) ---
        { name: "📶 API Gecikmesi", value: `${apiPing} ms`, inline: true },
        { name: "⏳ Çalışma Süresi", value: uptime, inline: true },
        { name: "💾 RAM Kullanımı", value: `${memoryUsage} MB`, inline: true },
          // --- KULLANICI / SUNUCU VERİLERİ ---
        { name: "👥 Toplam Kullanıcı", value: `${totalUsers}`, inline: true },
        { name: "🏠 Toplam Sunucu", value: `${totalGuilds}`, inline: true },
          // Shard varsa kaç Shard olduğu eklenebilir
          { name: "🔗 Shard Sayısı", value: client.shard ? `${client.shard.count}` : "Tek Parça", inline: true }, 
          // --- SİSTEM / TEKNİK VERİLER (Geliştirilmiş Kısım) ---
          { name: "\u200B", value: "**▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬**", inline: false }, // Ayırıcı
          { name: "💻 Sistem", value: `\`${platform}\``, inline: true },
          { name: "⏱️ Sistem Uptime", value: osUptime, inline: true },
          { name: "⚙️ CPU Modeli", value: `\`${cpuModel}\``, inline: false },
        { name: "🟢 Node.js Sürümü", value: `v${process.version}`, inline: true },
        { name: "📚 discord.js Sürümü", value: `v${require("discord.js").version}`, inline: true }
      )
      .setFooter({ text: `${client.user.username} | Gelişmiş İstatistik Sistemi` });
  };

  // Buton satırı (mevcut kodunuzdan alındı)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("yenile")
      .setLabel("🔄 Verileri Yenile")
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({ embeds: [await generateEmbed()], components: [row] });

  // Collector (mevcut kodunuzdan alındı)
  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 60000
  });

  collector.on("collect", async i => {
    if (i.customId === "yenile") {
      await i.update({ embeds: [await generateEmbed()], components: [row] });
    }
  });

  collector.on("end", async () => {
    try {
      const disabledRow = new ActionRowBuilder().addComponents(
        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );
      await msg.edit({ components: [disabledRow] });
    } catch {}
  });
};

module.exports.conf = { aliases: ["botbilgi", "bilgi"] };
module.exports.help = { name: "istatistik" };
