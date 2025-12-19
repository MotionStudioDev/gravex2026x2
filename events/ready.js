const client = require("../main");
const { Collection, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const db = require("orio.db");
const Reminder = require("../models/Reminder");

// Bot yeniden başlatılıyor mesajı (konsola)
console.log("🔄 Bot yeniden başlatılıyor... Lütfen bekleyin.");

client.on("ready", async () => {
  console.clear(); // Konsolu temizle (isteğe bağlı, daha temiz görünüm için)
  console.log("✅ Bot başarıyla aktif oldu!");
  console.log(`📛 Kullanıcı: ${client.user.tag}`);
  console.log(`🆔 ID: ${client.user.id}`);
  console.log(`🌍 Sunucu Sayısı: ${client.guilds.cache.size}`);
  console.log(`👥 Toplam Kullanıcı: ${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)}`);
  console.log(`📶 Ping: ${client.ws.ping}ms`);
  console.log(`🔗 Davet Linki: https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);
  console.log("────────────────────────────────────────");

  // Rastgele activity mesajları
  const activities = [
    `g!yardım | ${client.guilds.cache.size} sunucuda aktif!`,
    `g!davet | v1.0.9 | Yeni özellikler!`,
    `Kesintisiz Hizmet | ${client.users.cache.size} kullanıcıya hizmet!`,
    `g!yardım ile komutları keşfet!`,
    `Destek: discord.gg/CVZ4zEkJws`,
    `Ping: ${client.ws.ping}ms`
  ];

  setInterval(() => {
    const activity = activities[Math.floor(Math.random() * activities.length)];
    client.user.setActivity(activity, { type: 3 }); // Watching = 3
  }, 10000); // Her 10 saniyede bir değiştir

  client.user.setStatus("dnd"); // 🔴 Rahatsız Etmeyin

  // Komutları yükle
  client.commands = new Collection();
  client.aliases = new Collection();

  fs.readdir("./commands/", (err, files) => {
    if (err) return console.error("Komutlar yüklenirken hata:", err);
    console.log(`📁 Toplam ${files.length} komut yüklendi!`);
    files.forEach(f => {
      if (!f.endsWith(".js")) return;
      let props = require(`../commands/${f}`);
      console.log(`✔ ${props.help.name} komutu yüklendi.`);
      client.commands.set(props.help.name, props);
      props.conf.aliases.forEach(alias => {
        client.aliases.set(alias, props.help.name);
      });
    });
  });

  // İsteğe bağlı: Log kanalına aktif mesajı at (eğer kanal ID'si varsa)
  const logChannelId = "1416144862050259168"; // <-- Buraya log kanalının ID'sini yaz, yoksa sil
  if (logChannelId) {
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel) {
      const startEmbed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🟢 Bot Yeniden Başlatıldı ve Aktif!")
        .setDescription([
          `**Bot:** ${client.user.tag}`,
          `**Sunucu Sayısı:** ${client.guilds.cache.size}`,
          `**Kullanıcı Sayısı:** ${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)}`,
          `**Ping:** ${client.ws.ping}ms`,
          `**Zaman:** <t:${Math.floor(Date.now() / 1000)}:F>`
        ].join("\n"))
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));

      logChannel.send({ embeds: [startEmbed] }).catch(() => {});
    }
  }

  // Hatırlatma sistemi (cron job)
  setInterval(async () => {
    try {
      const now = new Date();
      const reminders = await Reminder.find({ status: "active", remindAt: { $lte: now } });

      for (const r of reminders) {
        try {
          const user = await client.users.fetch(r.userId);
          await user.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("⏰ Hatırlatma Zamanı!")
                .setDescription(`**Hatırlatma:** ${r.message}\n\nZaman: <t:${Math.floor(r.remindAt.getTime() / 1000)}:R>`)
                .setFooter({ text: "Hatırlatma tamamlandı." })
            ]
          });

          r.status = "done";
          await r.save();
        } catch (e) {
          console.error(`DM gönderilemedi (ID: ${r.userId}):`, e);
          // DM kapalıysa status'ü yine de done yap (spam olmasın)
          r.status = "done";
          await r.save();
        }
      }
    } catch (err) {
      console.error("Hatırlatma kontrolü hatası:", err);
    }
  }, 60 * 1000); // Her dakika kontrol et
});
