const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");

module.exports.run = async (client, message) => {
  try {
    // Ping durumu
    const ping = client.ws.ping;
    let pingStatus = "";
    if (ping < 100) pingStatus = "🟢 Çok İyi";
    else if (ping < 200) pingStatus = "🟡 İyi";
    else pingStatus = "🔴 Yavaş";

    // Bot istatistikleri
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const minutes = Math.floor(uptime / 60) % 60;
    
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const commandCount = client.commands ? client.commands.size : "Bilinmiyor";

    // Yardımcı fonksiyon: Komut listesini formatlar
    const formatCommands = (commandList) => {
      if (!commandList || commandList.length === 0) return "Bu kategoride henüz komut yok.";
      return commandList.map(cmd => `\`${cmd}\``).join(', ');
    }

    // --- 1. KOMUT LİSTELERİ ---
    const commandLists = {
      'genel': ['ping', 'istatistik', 'uptime', 'hata-bildir', 'hatırlat', 'yardım', 'davet', 'bot-bilgi'],
      'kullanici': ['avatar', 'profil', 'deprem', 'döviz', 'çeviri', 'emojiler', 'steam', 'songörülme', 'emoji-bilgi', 'banner', 'rol-bilgi'],
      'moderasyon': ['ban', 'unban', 'kick', 'sil', 'herkese-rol-ver', 'herkesten-rol-al', 'rol-ver', 'rol-al', 'nuke', 'lock', 'unlock', 'kanal-ekle', 'kanal-sil', 'uyar', 'mute', 'unmute', 'slowmode', 'isim-değiştir'],
      'sistem': ['sayaç', 'reklam-engel', 'küfür-engel', 'caps-lock', 'botlist-kur', 'botlist-ayarla', 'anti-raid', 'kayıt-sistemi', 'sa-as', 'ticket-sistemi', 'otorol', 'ses-sistemi', 'jail-sistemi', 'emoji-log', 'slowmode', 'hoşgeldin'],
      'sahip': ['reload', 'mesaj-gönder', 'eval', 'bakım', 'sunucular', 'çıkış'],
      'eğlence': ['ship', 'espiri', 'yazı-tura', 'burger', 'iskender', 'lahmacun', '2048', 'tweet', 'zar-at', 'slot', 'balık-tut', 'düello', 'slotmakinesi'],
      'ekonomi': ['param', 'günlük', 'çal', 'banka-oluştur', 'banka-transfer', 'banka-yatır', 'banka-çek', 'apara', 'cf', 'çalış', 'meslek', 'meslek-ayrıl', 'para-sıralama', 'market', 'satın-al'],
      'müzik': ['çal', 'dur', 'geç', 'devam', 'kuyruk', 'şarkı-atla', 'ses', 'döngü', 'karıştır'],
      'utility': ['hesapla', 'qr-oluştur', 'zaman', 'hava-durumu', 'doğum-günü', 'şifre-oluştur', 'url-kısalt'],
    };

    // --- 2. EMBED SAYFALARI ---
    const pages = {
      'ana_sayfa': new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🚀 GraveBOT Yardım Paneli")
        .setDescription(
          `**Merhaba ${message.author.username}!** Aşağıdaki menüden istediğin kategorileri keşfedebilirsin.\n\n` +
          `**Bot İstatistikleri:**\n` +
          `📊 Sunucular: **${guildCount}** | Kullanıcılar: **${userCount.toLocaleString()}**\n` +
          `⚡ Ping: **${ping}ms** (${pingStatus})\n` +
          `⏱️ Uptime: **${days}g ${hours}s ${minutes}d**\n` +
          `🔧 Komutlar: **${commandCount}**\n\n` +
          `**Prefix:** \`g!\`\n` +
          `**Destek için:** \`g!yardım [komut]\``
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ 
          text: `Komutu kullanan: ${message.author.tag} | Sayfa 1/9`, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp(),

      'genel': new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("⚙️ Genel Komutlar")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.genel), inline: false },
          { name: "ℹ️ Örnek Kullanım", value: "`g!ping` - Botun pingini gösterir\n`g!uptime` - Botun çalışma süresini gösterir", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.genel.length} komut | Prefix: g!` }),

      'kullanici': new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("👤 Kullanıcı Komutları")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.kullanici), inline: false },
          { name: "✨ Popüler Komutlar", value: "`g!profil` - Detaylı profil kartı\n`g!avatar @kullanıcı` - Avatar görüntüle\n`g!songörülme` - Son görülme bilgisi", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.kullanici.length} komut` }),

      'moderasyon': new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🛡️ Moderasyon Komutları")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.moderasyon), inline: false },
          { name: "⚠️ Yetki Gerektirir", value: "Bu komutların çoğu yetki gerektirir!", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.moderasyon.length} komut | Yetki: Yönetici/Moderatör` }),

      'sistem': new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle("🚨 Sistem Komutları")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.sistem), inline: false },
          { name: "🔧 Kurulum", value: "`g!otorol @rol` - Otorol sistemi\n`g!reklam-engel aç` - Reklam engelleme", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.sistem.length} komut | Yetki: Yönetici` }),

      'sahip': new EmbedBuilder()
        .setColor(0x99AAB5)
        .setTitle("👑 Sahip Komutları")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.sahip), inline: false },
          { name: "🔒 Sadece Bot Sahibi", value: "Bu komutları sadece bot sahibi kullanabilir.", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.sahip.length} komut | Yetki: Bot Sahibi` }),

      'eğlence': new EmbedBuilder()
        .setColor(0xEB459E)
        .setTitle("🎉 Eğlence Komutları")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.eğlence), inline: false },
          { name: "🎮 Popüler Oyunlar", value: "`g!slot` - Slot makinesi\n`g!2048` - 2048 oyunu\n`g!zar-at` - Zar atma", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.eğlence.length} komut` }),

      'ekonomi': new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("💰 Ekonomi Komutları")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.ekonomi), inline: false },
          { name: "💸 Ekonomi Sistemi", value: "`g!param` - Bakiyeni gör\n`g!çalış` - Para kazan\n`g!market` - Marketi gör", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.ekonomi.length} komut` }),

      'müzik': new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle("🎵 Müzik Komutları")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.müzik), inline: false },
          { name: "🎶 Kullanım", value: "`g!çal [şarkı]` - Şarkı çalar\n`g!kuyruk` - Kuyruğu gösterir\n`g!ses [1-100]` - Ses ayarı", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.müzik.length} komut | Ses Kanalı Gerektirir` }),

      'utility': new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("🔧 Utility Komutları")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.utility), inline: false },
          { name: "🛠️ Popüler Araçlar", value: "`g!hesapla` - Matematik işlemi\n`g!qr-oluştur` - QR kod oluştur\n`g!hava-durumu` - Hava durumu", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.utility.length} komut` }),
    };

    // --- 3. DROPDOWN MENÜ ---
    const menu = new StringSelectMenuBuilder()
      .setCustomId("helpMenu")
      .setPlaceholder("🏠 Kategori Seçiniz")
      .addOptions([
        { label: "Ana Sayfa", description: "Ana panel ve istatistikler", value: "ana_sayfa", emoji: "🏠" },
        { label: "Genel Komutlar", description: "Temel bot komutları", value: "genel", emoji: "⚙️" },
        { label: "Kullanıcı Komutları", description: "Kişisel araçlar ve bilgiler", value: "kullanici", emoji: "👤" },
        { label: "Moderasyon", description: "Yönetim ve güvenlik", value: "moderasyon", emoji: "🛡️" },
        { label: "Sistem", description: "Otomatik sistemler", value: "sistem", emoji: "🚨" },
        { label: "Eğlence", description: "Oyunlar ve eğlence", value: "eğlence", emoji: "🎉" },
        { label: "Ekonomi", description: "Para sistemi", value: "ekonomi", emoji: "💰" },
        { label: "Müzik", description: "Müzik çalma", value: "müzik", emoji: "🎵" },
        { label: "Utility", description: "Yardımcı araçlar", value: "utility", emoji: "🔧" },
        { label: "Sahip Komutları", description: "Bot sahibi komutları", value: "sahip", emoji: "👑" },
      ]);

    // --- 4. BUTONLARI OLUŞTUR ---
    // LINK BUTONLARI (CUSTOM ID YOK!)
    const websiteButton = new ButtonBuilder()
      .setLabel("🌐 Web Sitemiz")
      .setStyle(ButtonStyle.Link)
      .setURL("https://gravebot.com");

    const voteButton = new ButtonBuilder()
      .setLabel("✨ Oy Ver!")
      .setStyle(ButtonStyle.Link)
      .setURL("https://top.gg/bot/YOUR_BOT_ID/vote");

    const supportButton = new ButtonBuilder()
      .setLabel("🆘 Destek Sunucusu")
      .setStyle(ButtonStyle.Link)
      .setURL("https://discord.gg/CVZ4zEkJws");

    const inviteButton = new ButtonBuilder()
      .setLabel("🤖 Botu Davet Et")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);

    // Link butonlarını bir ActionRow'da topla
    const linkButtonsRow = new ActionRowBuilder()
      .addComponents(websiteButton, voteButton, supportButton, inviteButton);

    // ETKİLEŞİM BUTONLARI (CUSTOM ID VAR!)
    const refreshButton = new ButtonBuilder()
      .setCustomId("refresh")
      .setLabel("🔄 Yenile")
      .setStyle(ButtonStyle.Secondary);

    const closeButton = new ButtonBuilder()
      .setCustomId("close")
      .setLabel("❌ Kapat")
      .setStyle(ButtonStyle.Danger);

    const actionButtonsRow = new ActionRowBuilder()
      .addComponents(refreshButton, closeButton);

    // NAVİGASYON BUTONLARI
    const firstButton = new ButtonBuilder()
      .setCustomId("first")
      .setLabel("⏮️ İlk")
      .setStyle(ButtonStyle.Primary);

    const prevButton = new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("◀️ Geri")
      .setStyle(ButtonStyle.Primary);

    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("İleri ▶️")
      .setStyle(ButtonStyle.Primary);

    const lastButton = new ButtonBuilder()
      .setCustomId("last")
      .setLabel("Son ⏭️")
      .setStyle(ButtonStyle.Primary);

    const navButtonsRow = new ActionRowBuilder()
      .addComponents(firstButton, prevButton, nextButton, lastButton);

    // Menu row
    const menuRow = new ActionRowBuilder()
      .addComponents(menu);

    // --- 5. İLK MESAJI GÖNDERME ---
    const msg = await message.channel.send({
      embeds: [pages['ana_sayfa']],
      components: [menuRow, linkButtonsRow, navButtonsRow, actionButtonsRow],
    });

    // --- 6. KOLEKTÖR VE ETKİLEŞİM ---
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000, // 5 dakika
    });

    // Sayfa takibi
    const pageOrder = ['ana_sayfa', 'genel', 'kullanici', 'moderasyon', 'sistem', 'eğlence', 'ekonomi', 'müzik', 'utility', 'sahip'];
    let currentPageIndex = 0;

    collector.on("collect", async (i) => {
      try {
        // Link butonlarına tıklanırsa - doğrudan işleme gerek yok
        if (i.componentType === ComponentType.Button && i.componentStyle === ButtonStyle.Link) {
          return; // Discord otomatik olarak linki açar
        }

        // Dropdown seçimi
        if (i.customId === "helpMenu") {
          const selectedCategory = i.values[0];
          currentPageIndex = pageOrder.indexOf(selectedCategory);
          await i.update({ 
            embeds: [pages[selectedCategory]],
            components: [menuRow, linkButtonsRow, navButtonsRow, actionButtonsRow]
          });
          return;
        }
        
        // Yenile butonu
        if (i.customId === "refresh") {
          const updatedPing = client.ws.ping;
          const updatedDescription = `**Merhaba ${message.author.username}!** Aşağıdaki menüden istediğin kategorileri keşfedebilirsin.\n\n` +
            `**Bot İstatistikleri:**\n` +
            `📊 Sunucular: **${guildCount}** | Kullanıcılar: **${userCount.toLocaleString()}**\n` +
            `⚡ Ping: **${updatedPing}ms**\n` +
            `⏱️ Uptime: **${days}g ${hours}s ${minutes}d**\n` +
            `🔧 Komutlar: **${commandCount}**\n\n` +
            `**Prefix:** \`g!\`\n` +
            `**Destek için:** \`g!yardım [komut]\``;
          
          const updatedAnaSayfa = new EmbedBuilder(pages['ana_sayfa'].data)
            .setDescription(updatedDescription);
          
          await i.update({ 
            embeds: [updatedAnaSayfa],
            components: [menuRow, linkButtonsRow, navButtonsRow, actionButtonsRow]
          });
          return;
        }
        
        // Navigasyon butonları
        if (i.customId === "first") {
          currentPageIndex = 0;
        } else if (i.customId === "prev") {
          currentPageIndex = currentPageIndex > 0 ? currentPageIndex - 1 : pageOrder.length - 1;
        } else if (i.customId === "next") {
          currentPageIndex = currentPageIndex < pageOrder.length - 1 ? currentPageIndex + 1 : 0;
        } else if (i.customId === "last") {
          currentPageIndex = pageOrder.length - 1;
        }
        
        if (['first', 'prev', 'next', 'last'].includes(i.customId)) {
          await i.update({ 
            embeds: [pages[pageOrder[currentPageIndex]]],
            components: [menuRow, linkButtonsRow, navButtonsRow, actionButtonsRow]
          });
          return;
        }
        
        // Kapat butonu
        if (i.customId === "close") {
          const closedEmbed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle("📚 Yardım Paneli Kapatıldı")
            .setDescription(`Yardım paneli **${message.author.username}** tarafından kapatıldı.\n\nTekrar açmak için \`g!yardım\` yazabilirsiniz.`)
            .setFooter({ text: `Kapatılma: ${new Date().toLocaleTimeString('tr-TR')}` })
            .setTimestamp();
          
          await i.update({ 
            embeds: [closedEmbed], 
            components: [] 
          });
          collector.stop();
          return;
        }
      } catch (error) {
        console.error("Buton işleme hatası:", error);
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === 'time') {
        try {
          // Menüyü devre dışı bırak
          const disabledMenu = new StringSelectMenuBuilder(menu.data)
            .setDisabled(true)
            .setPlaceholder("⏰ Menü süresi doldu");
          
          const disabledMenuRow = new ActionRowBuilder()
            .addComponents(disabledMenu);
          
          // Navigasyon butonlarını devre dışı bırak
          const disabledFirst = new ButtonBuilder(firstButton.data)
            .setDisabled(true);
          const disabledPrev = new ButtonBuilder(prevButton.data)
            .setDisabled(true);
          const disabledNext = new ButtonBuilder(nextButton.data)
            .setDisabled(true);
          const disabledLast = new ButtonBuilder(lastButton.data)
            .setDisabled(true);
          
          const disabledNavRow = new ActionRowBuilder()
            .addComponents(disabledFirst, disabledPrev, disabledNext, disabledLast);
          
          // Etkileşim butonlarını devre dışı bırak
          const disabledRefresh = new ButtonBuilder(refreshButton.data)
            .setDisabled(true)
            .setLabel("⏰ Süre Doldu");
          const disabledClose = new ButtonBuilder(closeButton.data)
            .setDisabled(true);
          
          const disabledActionRow = new ActionRowBuilder()
            .addComponents(disabledRefresh, disabledClose);
          
          const timeoutEmbed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle("⏰ Yardım Paneli Süresi Doldu")
            .setDescription(`Yardım panelinin süresi doldu.\n\nYeniden açmak için \`g!yardım\` yazabilirsin.`)
            .setFooter({ text: `Son görüntülenme: ${new Date().toLocaleTimeString('tr-TR')}` });

          await msg.edit({ 
            embeds: [timeoutEmbed], 
            components: [disabledMenuRow, linkButtonsRow, disabledNavRow, disabledActionRow] 
          });
        } catch (error) {
          // Mesaj silinmiş olabilir, hata yutulur
        }
      }
    });
  } catch (err) {
    console.error("Yardım komutu hatası:", err);
    message.channel.send("⚠️ | Yardım menüsü oluşturulurken bir hata oluştu.");
  }
};

module.exports.conf = { 
  aliases: ["help", "yardim", "commands", "komutlar", "menu"] 
};

module.exports.help = { 
  name: "yardım",
  description: "GraveBOT'un tüm komutlarını gösteren gelişmiş yardım menüsü",
  usage: "g!yardım [komut-adı]",
  category: "Genel"
};
