const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports.run = async (client, message) => {
  try {
    // Ping durumu
    const ping = client.ws.ping;
    let pingEmoji = "🟢";
    if (ping > 200) pingEmoji = "🔴";
    else if (ping > 100) pingEmoji = "🟡";

    // Komut kategorileri
    const commandLists = {
      'genel': ['ping', 'istatistik', 'uptime', 'hata-bildir', 'hatırlat', 'yardım'],
      'kullanici': ['avatar', 'profil', 'deprem', 'hesapla', 'döviz', 'çeviri', 'emojiler', 'steam', 'afk', 'songörülme', 'emoji-bilgi'],
      'moderasyon': ['ban', 'unban', 'kick', 'sil', 'herkese-rol-ver', 'herkesten-rol-al', 'rol-ver', 'rol-al', 'nuke', 'lock', 'unlock', 'kanal-ekle', 'kanal-sil', 'uyar'],
      'sistem': ['sayaç', 'reklam-engel', 'küfür-engel', 'caps-lock', 'botlist-kur', 'botlist-ayarla', 'anti-raid', 'kayıt-sistemi', 'sa-as', 'ticket-sistemi', 'ticket-sıfırla', 'otorol', 'ses-sistemi', 'jail-sistemi', 'emoji-log', 'modlog', 'slowmode'],
      'sahip': ['reload', 'mesaj-gönder'],
      'eğlence': ['ship', 'espiri', 'yazı-tura', 'burger', 'iskender', 'lahmacun', '2048', 'tweet', 'çayiç', 'zar-at'],
      'ekonomi': ['param', 'günlük', 'çal', 'banka-oluştur', 'banka-transfer', 'banka-yatır', 'banka-çek', 'apara', 'cf', 'çalış', 'meslek', 'meslek-ayrıl', 'para-sıralama'],
    };

    // Toplam komut sayısı
    const totalCommands = Object.values(commandLists).reduce((acc, arr) => acc + arr.length, 0);

    // Yardımcı fonksiyon: Komutları formatla
    const formatCommands = (list) => list.map(cmd => `\`${cmd}\``).join(" • ") || "Bu kategoride komut yok.";

    // Embed sayfaları
    const pages = {
      'ana_sayfa': new EmbedBuilder()
        .setColor("Blurple")
        .setTitle("📚 GraveBOT Yardım Merkezi")
        .setDescription(
          `**Merhaba ${message.author.username}!**\n\n` +
          `**Prefix:** \`g!\`\n` +
          `**Toplam Komut:** ${totalCommands}\n` +
          `**Anlık Ping:** ${pingEmoji} **${ping}ms**\n\n` +
          `Aşağıdaki menüden bir kategori seçerek komutları görüntüleyebilirsin.\n\n` +
          `**Destek Sunucusu:** [Tıkla Katıl](https://discord.gg/CVZ4zEkJws)`
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Sayfa 1/8 • ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }),

      'genel': new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("⚙️ Genel Komutlar")
        .setDescription(`**Toplam:** ${commandLists.genel.length}\n\n${formatCommands(commandLists.genel)}`)
        .setFooter({ text: `Sayfa 2/8 • ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }),

      'kullanici': new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("👤 Kullanıcı Komutları")
        .setDescription(`**Toplam:** ${commandLists.kullanici.length}\n\n${formatCommands(commandLists.kullanici)}`)
        .setFooter({ text: `Sayfa 3/8 • ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }),

      'moderasyon': new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🛡️ Moderasyon Komutları")
        .setDescription(`**Toplam:** ${commandLists.moderasyon.length}\n\n${formatCommands(commandLists.moderasyon)}`)
        .setFooter({ text: `Sayfa 4/8 • ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }),

      'sistem': new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("🚨 Sistem Komutları")
        .setDescription(`**Toplam:** ${commandLists.sistem.length}\n\n${formatCommands(commandLists.sistem)}`)
        .setFooter({ text: `Sayfa 5/8 • ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }),

      'sahip': new EmbedBuilder()
        .setColor(0x99aab5)
        .setTitle("👑 Sahip Komutları")
        .setDescription(`**Toplam:** ${commandLists.sahip.length}\n\n${formatCommands(commandLists.sahip)}`)
        .setFooter({ text: `Sayfa 6/8 • ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }),

      'eğlence': new EmbedBuilder()
        .setColor(0xe91e63)
        .setTitle("🎉 Eğlence Komutları")
        .setDescription(`**Toplam:** ${commandLists.eğlence.length}\n\n${formatCommands(commandLists.eğlence)}`)
        .setFooter({ text: `Sayfa 7/8 • ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }),

      'ekonomi': new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("💰 Ekonomi Komutları")
        .setDescription(`**Toplam:** ${commandLists.ekonomi.length}\n\n${formatCommands(commandLists.ekonomi)}`)
        .setFooter({ text: `Sayfa 8/8 • ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }),
    };

    // Dropdown Menü
    const menu = new StringSelectMenuBuilder()
      .setCustomId("helpMenu")
      .setPlaceholder("Kategori seç...")
      .addOptions([
        { label: "Ana Sayfa", description: "Yardım menüsünün ana sayfası", value: "ana_sayfa", emoji: "🏠" },
        { label: "Genel Komutlar", description: "Temel bot komutları", value: "genel", emoji: "⚙️" },
        { label: "Kullanıcı Komutları", description: "Kişisel bilgi ve eğlence", value: "kullanici", emoji: "👤" },
        { label: "Moderasyon", description: "Sunucu yönetimi", value: "moderasyon", emoji: "🛡️" },
        { label: "Sistem", description: "Otomatik sistemler", value: "sistem", emoji: "🚨" },
        { label: "Sahip Komutları", description: "Bot sahibine özel", value: "sahip", emoji: "👑" },
        { label: "Eğlence", description: "Eğlenceli komutlar", value: "eğlence", emoji: "🎉" },
        { label: "Ekonomi", description: "Para sistemi", value: "ekonomi", emoji: "💰" },
      ]);

    // Link Butonları
    const linkButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🌐 Web Sitemiz")
        .setStyle(ButtonStyle.Link)
        .setURL("https://gravebot.vercel.app"),
      new ButtonBuilder()
        .setLabel("✨ Oy Ver!")
        .setStyle(ButtonStyle.Link)
        .setURL("https://top.gg/bot/1066016782827130960/vote"),
      new ButtonBuilder()
        .setLabel("🆘 Destek Sunucusu")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/CVZ4zEkJws"),
      new ButtonBuilder()
        .setLabel("🤖 Davet Et!")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
    );

    const menuRow = new ActionRowBuilder().addComponents(menu);

    // İlk mesajı gönder
    const msg = await message.channel.send({
      embeds: [pages['ana_sayfa']],
      components: [menuRow, linkButtons],
    });

    // Collector
    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 120000,
    });

    collector.on("collect", async i => {
      if (i.customId === "helpMenu") {
        const selected = i.values[0];
        await i.update({
          embeds: [pages[selected]],
          components: [menuRow, linkButtons]
        });
      }
    });

    collector.on("end", async () => {
      try {
        const disabledMenu = StringSelectMenuBuilder.from(menu)
          .setDisabled(true)
          .setPlaceholder("Süre doldu • Tekrar kullan: g!yardım");

        const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);

        const timeoutEmbed = new EmbedBuilder()
          .setColor(0x2f3136)
          .setTitle("⏰ Yardım Menüsü Kapandı")
          .setDescription("Menünün süresi doldu.\nTekrar görüntülemek için `g!yardım` yazabilirsin.")
          .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        await msg.edit({
          embeds: [timeoutEmbed],
          components: [disabledRow, linkButtons]
        });
      } catch (err) {
        console.error("Yardım menüsü timeout hatası:", err);
      }
    });

  } catch (err) {
    console.error("Yardım komutu hatası:", err);
    message.channel.send("⚠️ Yardım menüsü oluşturulurken bir hata oluştu.");
  }
};

module.exports.conf = { aliases: ["help", "yardim", "commands"] };
module.exports.help = { name: "yardım" };
