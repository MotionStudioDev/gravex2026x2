const { Collection, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const db = require("orio.db");
const Reminder = require("../models/Reminder");
const moment = require("moment");
require("moment-duration-format");

module.exports = async (client) => {
  console.log(`${client.user.tag} Aktif!`);

  // Aktivite ve durum
  let x = [
    `g!yardım - v1.0.2 - Jail Sistemi Eklendi!`
  ];
  let q = x[Math.floor(Math.random() * x.length)];

  client.user.setActivity(q);
  client.user.setStatus("dnd");

  // Komutlar ve aliaslar yükleme
  client.commands = new Collection();
  client.aliases = new Collection();

  fs.readdir("./commands/", (err, files) => {
    if (err) console.error(err);
    console.log(`Toplam ${files.length} komut var!`);

    files.forEach(f => {
      let props = require(`../commands/${f}`);
      console.log(`${props.help.name}.js Komutu aktif!`);
      client.commands.set(props.help.name, props);
      props.conf.aliases.forEach(alias => {
        client.aliases.set(alias, props.help.name);
      });
    });
  });

  // 🔔 Hatırlatma cron job
  setInterval(async () => {
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
              .setDescription(`Hatırlatma: **${r.message}**`)
          ]
        });
        r.status = "done";
        await r.save();
      } catch (e) {
        console.error("DM gönderilemedi:", e);
      }
    }
  }, 60 * 1000);

  // 🎭 Dram replikleri + uptime embed
  const dramlar = [
    'Yine mi ben? Neyse, geldik işte.',
    'Sustum, ama dönmek zorunda kaldım.',
    'Kodlar ağladı, ben geldim.',
    'Sistem çöktü, ruhumla geldim.',
    'Ben yokken ne yaptınız acaba...',
    'Yalnızlıktan sıkıldım, geri döndüm.',
    'Yeniden başlamak mı? Alıştım artık.',
    'Gittim, düşündüm, döndüm.',
    'Yükleniyorum... ama içim hâlâ boş.',
    'Ben gelince her şey düzelir sanıyorsunuz ya...'
  ];

  const uptime = moment.duration(process.uptime(), "seconds").format("H [Saat], m [Dakika], s [Saniye]");
  const secilen = dramlar[Math.floor(Math.random() * dramlar.length)];

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(`🟢 ${secilen}`)
    .setDescription(`Başlama sürem: **${uptime}**`);

  try {
    const kanal = await client.channels.fetch("1416144862050259168"); // senin kanal ID
    if (kanal) {
      kanal.send({ embeds: [embed] });
    } else {
      console.error("Kanal bulunamadı veya erişim yok!");
    }
  } catch (err) {
    console.error("Kanal fetch hatası:", err);
  }
};
