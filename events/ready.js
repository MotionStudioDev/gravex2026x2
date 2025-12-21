const client = require("../main");
const { Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const db = require("orio.db");
const Reminder = require("../models/Reminder");
const Giveaway = require("../models/giveaway"); // <<< GIVEAWAY MODELİ EKLENDİ

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
    `g!davet | v2.0.0 | Yeni özellikler!`,
    `Kesintisiz Hizmet | ${client.users.cache.size} kullanıcıya hizmet!`,
    `g!yardım ile komutları keşfet!`,
    `g!deprem - 7/24 Depremleri gör`,
    `g!yapayzeka - Yeni Nesil Modeller`
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

  // İsteğe bağlı: Log kanalına aktif mesajı at
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
          r.status = "done";
          await r.save();
        }
      }
    } catch (err) {
      console.error("Hatırlatma kontrolü hatası:", err);
    }
  }, 60 * 1000); // Her dakika kontrol et

  // =========================================================
  // GIVEAWAY SİSTEMİ - INTERACTION (KATILMA BUTONU)
  // =========================================================
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'join_giveaway') return;

    const data = await Giveaway.findOne({ messageId: interaction.message.id });
    if (!data) return interaction.reply({ content: '❌ Bu çekiliş veritabanında bulunamadı veya silinmiş.', ephemeral: true });
    if (data.ended) return interaction.reply({ content: '❌ Bu çekiliş çoktan sona erdi.', ephemeral: true });

    if (data.participants.includes(interaction.user.id)) {
      return interaction.reply({ content: '⚠️ Zaten bu çekilişe katılmışsın!', ephemeral: true });
    }

    await Giveaway.updateOne(
      { messageId: interaction.message.id },
      { $push: { participants: interaction.user.id } }
    );

    return interaction.reply({ content: '🎉 Başarıyla çekilişe katıldın! Bol şans.', ephemeral: true });
  });
});

// =========================================================
// ÇEKİLİŞİ DIŞARIDAN BİTİRME FONKSİYONU (komut ile çağır)
// =========================================================
module.exports.endGiveawayExternal = async (client, messageId) => {
  const data = await Giveaway.findOne({ messageId });
  if (!data || data.ended) return;

  const channel = client.channels.cache.get(data.channelId);
  if (!channel) return;

  try {
    const message = await channel.messages.fetch(data.messageId);

    // Katılımcı kopyası (orijinali bozmayalım)
    let participants = [...data.participants];
    let winners = [];

    if (participants.length === 0) {
      winners = [];
    } else if (participants.length <= data.winnerCount) {
      winners = participants;
    } else {
      // Fisher-Yates shuffle - tamamen adil
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
      }
      winners = participants.slice(0, data.winnerCount);
    }

    await Giveaway.updateOne({ messageId }, { ended: true });

    const winnerText = winners.length > 0 
      ? winners.map(id => `<@${id}>`).join(', ')
      : 'Kimse katılmadı :(';

    const endEmbed = new EmbedBuilder()
      .setColor('Grey')
      .setTitle(`🏁 ÇEKİLİŞ SONA ERDİ: ${data.prize}`)
      .setDescription(
        `🏆 **Kazananlar:**\n${winnerText}\n\n` +
        `👥 **Toplam Katılımcı:** ${data.participants.length}`
      )
      .setFooter({ text: 'Çekiliş tamamlandı.' })
      .setTimestamp();

    const disabledBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('join_giveaway')
        .setLabel('Sona Erdi')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔒')
        .setDisabled(true)
    );

    await message.edit({ embeds: [endEmbed], components: [disabledBtn] });

    if (winners.length > 0) {
      await channel.send(`🎉 **Tebrikler!** \`${data.prize}\` kazananlar: ${winnerText}`);
    } else {
      await channel.send(`😕 **${data.prize}** çekilişine kimse katılmadı.`);
    }
  } catch (err) {
    console.error('Çekiliş bitirilirken hata:', err);
  }
};
