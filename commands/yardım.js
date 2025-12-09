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
    const formatCommands = (commandList, emoji) => {
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
      // Ana Sayfa
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
        .setImage("https://media.discordapp.net/attachments/1128327352385015830/1128327355027492874/help_banner.png")
        .setFooter({ 
          text: `Komutu kullanan: ${message.author.tag} | Sayfa 1/9`, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp(),

      // Genel
      'genel': new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("⚙️ Genel Komutlar")
        .setDescription("Temel bot komutları ve yardımcı araçlar.")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.genel), inline: false },
          { name: "ℹ️ Örnek Kullanım", value: "`g!ping` - Botun pingini gösterir\n`g!uptime` - Botun çalışma süresini gösterir", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.genel.length} komut | Prefix: g!` }),

      // Kullanıcı
      'kullanici': new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("👤 Kullanıcı Komutları")
        .setDescription("Kullanıcı bilgileri ve kişisel araçlar.")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.kullanici), inline: false },
          { name: "✨ Popüler Komutlar", value: "`g!profil` - Detaylı profil kartı\n`g!avatar @kullanıcı` - Avatar görüntüle\n`g!songörülme` - Son görülme bilgisi", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.kullanici.length} komut` }),

      // Moderasyon
      'moderasyon': new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🛡️ Moderasyon Komutları")
        .setDescription("Sunucu yönetimi ve güvenlik komutları.")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.moderasyon), inline: false },
          { name: "⚠️ Yetki Gerektirir", value: "Bu komutların çoğu yetki gerektirir!", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.moderasyon.length} komut | Yetki: Yönetici/Moderatör` }),

      // Sistem
      'sistem': new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle("🚨 Sistem Komutları")
        .setDescription("Otomatik sistemler ve konfigürasyon komutları.")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.sistem), inline: false },
          { name: "🔧 Kurulum", value: "`g!otorol @rol` - Otorol sistemi\n`g!reklam-engel aç` - Reklam engelleme", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.sistem.length} komut | Yetki: Yönetici` }),

      // Sahip
      'sahip': new EmbedBuilder()
        .setColor(0x99AAB5)
        .setTitle("👑 Sahip Komutları")
        .setDescription("Bot sahibine özel komutlar.")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.sahip), inline: false },
          { name: "🔒 Sadece Bot Sahibi", value: "Bu komutları sadece bot sahibi kullanabilir.", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.sahip.length} komut | Yetki: Bot Sahibi` }),

      // Eğlence
      'eğlence': new EmbedBuilder()
        .setColor(0xEB459E)
        .setTitle("🎉 Eğlence Komutları")
        .setDescription("Oyunlar ve eğlenceli etkileşimler.")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.eğlence), inline: false },
          { name: "🎮 Popüler Oyunlar", value: "`g!slot` - Slot makinesi\n`g!2048` - 2048 oyunu\n`g!zar-at` - Zar atma", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.eğlence.length} komut` }),

      // Ekonomi
      'ekonomi': new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("💰 Ekonomi Komutları")
        .setDescription("Para sistemi ve ticaret komutları.")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.ekonomi), inline: false },
          { name: "💸 Ekonomi Sistemi", value: "`g!param` - Bakiyeni gör\n`g!çalış` - Para kazan\n`g!market` - Marketi gör", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.ekonomi.length} komut` }),

      // Müzik
      'müzik': new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle("🎵 Müzik Komutları")
        .setDescription("Ses kanalında müzik çalma komutları.")
        .addFields(
          { name: "📋 Komut Listesi", value: formatCommands(commandLists.müzik), inline: false },
          { name: "🎶 Kullanım", value: "`g!çal [şarkı]` - Şarkı çalar\n`g!kuyruk` - Kuyruğu gösterir\n`g!ses [1-100]` - Ses ayarı", inline: false }
        )
        .setFooter({ text: `Toplam: ${commandLists.müzik.length} komut | Ses Kanalı Gerektirir` }),

      // Utility
      'utility': new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("🔧 Utility Komutları")
        .setDescription("Kullanışlı araçlar ve yardımcı komutlar.")
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

    // --- 4. BUTONLAR ---
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("website")
        .setLabel("🌐 Web Sitemiz")
        .setStyle(ButtonStyle.Link)
        .setURL("https://gravebot.com"), // Web site URL'sini buraya ekleyin
      new ButtonBuilder()
        .setCustomId("vote")
        .setLabel("✨ Oy Ver!")
        .setStyle(ButtonStyle.Link)
        .setURL("https://top.gg/bot/YOUR_BOT_ID/vote"), // Top.gg oy linki
      new ButtonBuilder()
        .setCustomId("support")
        .setLabel("🆘 Destek Sunucusu")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/CVZ4zEkJws"),
      new ButtonBuilder()
        .setCustomId("invite")
        .setLabel("🤖 Botu Davet Et")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands"),
      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("🔄 Yenile")
        .setStyle(ButtonStyle.Secondary)
    );

    // Navigasyon butonları
    const navButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("first")
        .setLabel("⏮️ İlk")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀️ Geri")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("İleri ▶️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("last")
        .setLabel("Son ⏭️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("close")
        .setLabel("❌ Kapat")
        .setStyle(ButtonStyle.Danger)
    );

    // --- 5. İLK MESAJI GÖNDERME ---
    const msg = await message.channel.send({
      embeds: [pages['ana_sayfa']],
      components: [new ActionRowBuilder().addComponents(menu), buttons, navButtons],
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
      // Dropdown seçimi
      if (i.customId === "helpMenu") {
        const selectedCategory = i.values[0];
        currentPageIndex = pageOrder.indexOf(selectedCategory);
        await i.update({ 
          embeds: [pages[selectedCategory]],
          components: [new ActionRowBuilder().addComponents(menu), buttons, navButtons] 
        });
      }
      
      // Yenile butonu
      if (i.customId === "refresh") {
        const updatedPing = client.ws.ping;
        pages['ana_sayfa'].setDescription(
          pages['ana_sayfa'].data.description.replace(
            /Ping: \*\*\d+ms\*\*/,
            `Ping: **${updatedPing}ms**`
          )
        );
        await i.update({ embeds: [pages[pageOrder[currentPageIndex]]] });
      }
      
      // Navigasyon butonları
      if (i.customId === "first") {
        currentPageIndex = 0;
        await i.update({ embeds: [pages[pageOrder[currentPageIndex]]] });
      }
      
      if (i.customId === "prev") {
        currentPageIndex = currentPageIndex > 0 ? currentPageIndex - 1 : pageOrder.length - 1;
        await i.update({ embeds: [pages[pageOrder[currentPageIndex]]] });
      }
      
      if (i.customId === "next") {
        currentPageIndex = currentPageIndex < pageOrder.length - 1 ? currentPageIndex + 1 : 0;
        await i.update({ embeds: [pages[pageOrder[currentPageIndex]]] });
      }
      
      if (i.customId === "last") {
        currentPageIndex = pageOrder.length - 1;
        await i.update({ embeds: [pages[pageOrder[currentPageIndex]]] });
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
      }
    });

    collector.on("end", async () => {
      try {
        // Menüyü devre dışı bırak
        const disabledMenu = new ActionRowBuilder().addComponents(
          StringSelectMenuBuilder.from(menu)
            .setDisabled(true)
            .setPlaceholder("⏰ Menü süresi doldu")
        );
        
        const disabledButtons = new ActionRowBuilder().addComponents(
          ButtonBuilder.from(buttons.components[4]) // Sadece yenile butonunu devre dışı bırak
            .setDisabled(true)
            .setLabel("⏰ Süre Doldu")
            .setStyle(ButtonStyle.Secondary)
        );
        
        const disabledNav = new ActionRowBuilder().addComponents(
          ...navButtons.components.map(btn => 
            ButtonBuilder.from(btn).setDisabled(true)
          )
        );
        
        const timeoutEmbed = new EmbedBuilder(pages['ana_sayfa'].data)
          .setDescription(`**⏰ Yardım panelinin süresi doldu.**\n\nYeniden açmak için \`g!yardım\` yazabilirsin.`)
          .setFields([])
          .setFooter({ text: `Son görüntülenme: ${new Date().toLocaleTimeString('tr-TR')}` });

        await msg.edit({ 
          embeds: [timeoutEmbed], 
          components: [disabledMenu, buttons.components.slice(0, 4), disabledNav] 
        });
      } catch (error) {
        console.error("Yardım menüsü kapatma hatası:", error);
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
