const { EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const GuildSettings = require("../models/GuildSettings");
const TicketModel = require("../models/Ticket");
const AfkModel = require("../models/Afk"); // <--- AFK MODEL EKLENDİ

// Otomatik kapanma süresi (interactionCreate'de de aynı olmalı!)
const AUTO_CLOSE_TIMEOUT = 15 * 60 * 1000; // 15 dakika

// Küfür listesi
const küfürler = [
  "amk", "ananı", "ananı sikeyim", "orospu", "orospu çocuğu", "oç", "oc",
  "piç", "pıç", "yarrak", "yarak", "sik", "sık", "göt", "götü", "götün",
  "salak", "aptal", "gerizekalı", "ibne", "siktir", "sikik", "amına", "amcık"
];

// Reklam paternleri
const reklamlar = [
  "discord.gg/", ".gg/", "discordapp.com/invite/", "discord.me/",
  "http://", "https://", ".com", ".net", ".org", ".xyz"
];

// Kelime sınırlarını kontrol etmek için (yanlış tespit önleme)
const kelimeSınırKontrol = (text, word) => {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
};

module.exports = async (message) => {
  if (!message.guild || message.author.bot) return;
  const client = message.client;
  const içerik = message.content.toLowerCase().replace(/[^a-zğüşıöç0-9\s]/g, " ");
  const tamİçerik = message.content;

  // =========================================================
  // BOT ETİKETLENİNCE YANIT VER
  // =========================================================
  const prefixMention = `<@${client.user.id}>`;
  if (message.content.trim() === prefixMention || message.content.trim().startsWith(`${prefixMention} `)) {
    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("👋 Merhaba!")
      .setDescription("Beni etiketledin! Komutlar için `g!yardım` yazabilirsin.\nSunucunda küfür/reklam koruması ve selam sistemi aktif olabilir.")
      .setFooter({ text: "GraveBOT • 2026" })
      .setTimestamp();
    return message.channel.send({ embeds: [embed] }).catch(() => {});
  }

  // =========================================================
  // SUNUCU AYARLARINI ÇEK
  // =========================================================
  const settings = await GuildSettings.findOne({ guildId: message.guild.id });
  if (!settings) return;

  // =========================================================
  // 1. AFK BOZMA KONTROLÜ (Kullanıcı mesaj yazınca AFK kalkar)
  // =========================================================
  const afkData = await AfkModel.findOne({ guildId: message.guildId, userId: message.author.id });
  if (afkData) {
    await AfkModel.deleteOne({ guildId: message.guildId, userId: message.author.id });

    if (message.member.manageable) {
      await message.member.setNickname(afkData.oldNickname).catch(() => {});
    }

    const hoşgeldin = await message.reply(`Hoş geldin **${message.author.username}**! AFK modundan çıkarıldın.`);
    setTimeout(() => hoşgeldin.delete().catch(() => {}), 5000);
    // AFK kalktığı için diğer kontrolleri atla (küfür/reklam vs. mesajı silinmesin)
    return;
  }

  // =========================================================
  // 2. ETİKETLENEN KİŞİ AFK MI KONTROLÜ
  // =========================================================
  if (message.mentions.users.size > 0) {
    for (const user of message.mentions.users.values()) {
      if (user.id === message.author.id) continue; // Kendini etiketlerse atla
      const data = await AfkModel.findOne({ guildId: message.guildId, userId: user.id });
      if (data) {
        const süre = `<t:${Math.floor(data.timestamp / 1000)}:R>`;
        message.reply(`🛑 **${user.username}** şu an AFK!\n**Sebep:** ${data.reason}\n**AFK Olma Süresi:** ${süre}`)
          .then(m => setTimeout(() => m.delete().catch(() => {}), 10000));
      }
    }
  }

  // =========================================================
  // TICKET OTOMATİK KAPANMA TIMER SIFIRLAMA
  // =========================================================
  const ticketData = await TicketModel.findOne({
    channelId: message.channel.id,
    status: 'open'
  });
  if (ticketData) {
    await TicketModel.updateOne(
      { channelId: message.channel.id },
      { lastActivity: Date.now() }
    );
    if (client.ticketTimeouts && client.ticketTimeouts[message.channel.id]) {
      clearTimeout(client.ticketTimeouts[message.channel.id]);
    }
    if (!client.ticketTimeouts) client.ticketTimeouts = {};
    client.ticketTimeouts[message.channel.id] = setTimeout(async () => {
      const stillOpen = await TicketModel.findOne({
        channelId: message.channel.id,
        status: 'open'
      });
      if (stillOpen && message.channel.deletable) {
        await message.channel.send('⏰ Uzun süredir yeni mesaj gelmediği için bu ticket otomatik olarak kapatılıyor...');
        setTimeout(async () => {
          try {
            const parentId = message.channel.parentId;
            const voiceChannel = message.guild.channels.cache.find(c =>
              c.type === ChannelType.GuildVoice &&
              c.parentId === parentId &&
              c.name.startsWith('🔊-')
            );
            if (voiceChannel) await voiceChannel.delete().catch(() => {});
            await message.channel.delete().catch(() => {});
          } catch (e) {
            console.log("Otomatik kapatma silme hatası:", e);
          }
        }, 5000);
      }
    }, AUTO_CLOSE_TIMEOUT);
  }

  // =========================================================
  // KÜFÜR ENGELLEME
  // =========================================================
  if (settings.kufurEngel) {
    const tespitEdilen = küfürler.find(k =>
      içerik.includes(k) || kelimeSınırKontrol(tamİçerik, k)
    );
    if (tespitEdilen) {
      try {
        await message.delete();
        const uyarı = await message.channel.send({
          embeds: [new EmbedBuilder()
            .setColor("Red")
            .setDescription(`🚫 **${message.author}**, lütfen küfür etmeyin! Temiz bir ortam istiyoruz.`)
          ]
        });
        setTimeout(() => uyarı.delete().catch(() => {}), 5000);
        if (settings.kufurLog) {
          const logKanal = message.guild.channels.cache.get(settings.kufurLog);
          if (logKanal && logKanal.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)) {
            const logEmbed = new EmbedBuilder()
              .setColor("DarkRed")
              .setTitle("🛑 Küfür Tespit Edildi")
              .addFields(
                { name: "Kullanıcı", value: `${message.author} (\`${message.author.id}\`)` },
                { name: "Kanal", value: `<#${message.channel.id}>` },
                { name: "Küfür", value: `\`${tespitEdilen}\`` },
                { name: "Mesaj", value: tamİçerik.length > 1000 ? tamİçerik.substring(0, 1000) + "..." : tamİçerik },
                { name: "Zaman", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
              )
              .setThumbnail(message.author.displayAvatarURL());
            logKanal.send({ embeds: [logEmbed] }).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Küfür silinemedi:", err);
      }
      return;
    }
  }

  // =========================================================
  // REKLAM ENGELLEME
  // =========================================================
  if (settings.reklamEngel) {
    const reklamVar = reklamlar.some(r => içerik.includes(r));
    if (reklamVar) {
      try {
        await message.delete();
        const logKanal = settings.reklamLog
          ? message.guild.channels.cache.get(settings.reklamLog)
          : message.channel;
        if (logKanal && logKanal.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)) {
          const embed = new EmbedBuilder()
            .setColor("Orange")
            .setTitle("🚫 Reklam / Davet Tespit Edildi")
            .addFields(
              { name: "Kullanıcı", value: `${message.author} (\`${message.author.id}\`)` },
              { name: "Kanal", value: `<#${message.channel.id}>` },
              { name: "Mesaj", value: tamİçerik.length > 1000 ? tamİçerik.substring(0, 1000) + "..." : tamİçerik },
              { name: "Zaman", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
            )
            .setThumbnail(message.author.displayAvatarURL());
          await logKanal.send({ embeds: [embed] });
        }
        if (!settings.reklamLog) {
          message.channel.send({
            embeds: [new EmbedBuilder()
              .setColor("Red")
              .setDescription(`⚠️ **${message.author}**, sunucuda link veya davet paylaşımı yasaktır!`)
            ]
          }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
      } catch (err) {
        console.error("Reklam silinemedi:", err);
      }
      return;
    }
  }

  // =========================================================
  // SELAM ALMA SİSTEMİ
  // =========================================================
  if (settings.saasAktif) {
    const selamlar = ["sa", "selam", "selamün aleyküm", "selamun aleyküm", "sea", "s.a", "selamun aleykum"];
    const selamVerildi = selamlar.some(s =>
      içerik === s ||
      içerik.startsWith(s + " ") ||
      içerik.startsWith(s + ",") ||
      içerik.startsWith(s + ".")
    );
    if (selamVerildi) {
      const yanıtlar = [
        "Aleyküm selam, hoş geldin! 👋",
        "Selam selam! Nasılsın bugün? 😄",
        "Aleyküm selam kardeşim, hayırlı olsun!",
        "Selamün aleyküm, nasılsın dostum?",
        "Sa kanka, iyi misin? 🔥",
        "Aleyküm selam, ne haber? 🌟"
      ];
      const rastgele = yanıtlar[Math.floor(Math.random() * yanıtlar.length)];
      message.reply(rastgele).catch(() => {});
    }
  }
};
