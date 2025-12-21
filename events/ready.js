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

  // Rastgele activity mesajları
  const activities = [
    `g!yardım | ${client.guilds.cache.size} sunucuda aktif!`,
    `g!davet | v2.0.0 | Yeni özellikler!`,
    `Kesintisiz Hizmet | ${client.users.cache.size} kullanıcıya hizmet!`,
    `g!yardım ile komutları keşfet!`,
    `g!deprem - 7/24 Depremleri gör`,
    `g!yapayzeka - Yeni Nesil Modeller`
  ];

  setInterval(() => {
    const activity = activities[Math.floor(Math.random() * activities.length)];
    client.user.setActivity(activity, { type: 3 }); // Watching
  }, 10000);

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
      client.commands.set(props.help.name, props);
      if (props.conf && props.conf.aliases) {
        props.conf.aliases.forEach(alias => {
          client.aliases.set(alias, props.help.name);
        });
      }
    });
  });

  // Log kanalına mesaj gönder (ID kontrolü ile)
  const logChannelId = "1416144862050259168"; 
  if (logChannelId) {
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel) {
      const startEmbed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🟢 Bot Yeniden Başlatıldı")
        .setDescription([
          `**Bot:** ${client.user.tag}`,
          `**Ping:** ${client.ws.ping}ms`,
          `**Zaman:** <t:${Math.floor(Date.now() / 1000)}:F>`
        ].join("\n"))
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));
      logChannel.send({ embeds: [startEmbed] }).catch(() => {});
    }
  }

  // Hatırlatma sistemi (cron job) - Sadece hatırlatma kaldı
  setInterval(async () => {
    try {
      const now = new Date();
      // Veritabanında süresi gelmiş aktif hatırlatıcıları bul
      const reminders = await Reminder.find({ status: "active", remindAt: { $lte: now } });
      
      for (const r of reminders) {
        try {
          const user = await client.users.fetch(r.userId).catch(() => null);
          if (user) {
            const reminderEmbed = new EmbedBuilder()
              .setColor("Yellow")
              .setTitle("⏰ Hatırlatma Zamanı!")
              .setDescription(`**Mesajın:** ${r.message}`)
              .setFooter({ text: "Grave Hatırlatma Sistemi" })
              .setTimestamp();

            await user.send({ embeds: [reminderEmbed] }).catch(() => {});
          }
          r.status = "done";
          await r.save();
        } catch (e) {
          console.error(`Hatırlatma işlenirken hata (User: ${r.userId}):`, e);
          r.status = "done";
          await r.save();
        }
      }
    } catch (err) {
      console.error("Hatırlatma döngüsü hatası:", err);
    }
  }, 60000); // Dakikada bir kontrol

});
