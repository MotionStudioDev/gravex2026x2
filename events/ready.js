const client = require("../main");
const { Collection, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const db = require("orio.db"); // senin kullandığın orio.db
const Reminder = require("../models/Reminder"); // bizim hatırlatma modeli

client.on("ready", () => {
  console.log(`${client.user.tag} Aktif!`);

  let x = [
    `g!yardım - Bakım Aktif - Grave v1.0.6`
  ];
  let q = x[Math.floor(Math.random() * x.length)];

  client.user.setActivity(q);
  client.user.setStatus("dnd"); // 🔴 Durum: Rahatsız Etmeyin

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
  }, 60 * 1000); // her dakika kontrol
});
