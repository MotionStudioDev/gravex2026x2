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
    
    // Yardımcı fonksiyon: Komut listesini formatlar
    const formatCommands = (commandList, emoji) => {
        return commandList.map(cmd => `\`${cmd}\``).join(', ');
    }

    // --- 1. KOMUT LİSTELERİ ---
    const commandLists = {
        'genel': ['ping', 'istatistik', 'uptime', 'hata-bildir', 'hatırlat', 'yardım'],
        'kullanici': ['avatar', 'profil', 'deprem', 'hesapla', 'döviz', 'çeviri', 'emojiler', 'steam', 'songörülme', 'emoji-bilgi'],
        'moderasyon': ['ban', 'unban', 'kick', 'sil', 'herkese-rol-ver', 'herkesten-rol-al', 'rol-ver','rol-al', 'nuke', 'lock', 'unlock', 'kanal-ekle', 'kanal-sil', 'uyar'],
        'sistem': ['sayaç', 'reklam-engel', 'küfür-engel', 'caps-lock', 'botlist-kur', 'botlist-ayarla', 'anti-raid', 'kayıt-sistemi', 'sa-as', 'ticket-sistemi', 'ticket-sıfırla',  'otorol', 'ses-sistemi', 'jail-sistemi', 'emoji-log', 'modlog', 'slowmode'],
        'sahip': ['reload', 'mesaj-gönder'],
        'eğlence': ['ship', 'espiri', 'yazı-tura', 'burger', 'iskender', 'lahmacun', '2048', 'tweet', 'çayiç', 'zar-at'],
        'ekonomi': ['param', 'günlük', 'çal', 'banka-oluştur', 'banka-transfer', 'banka-yatır', 'banka-çek', 'apara', 'cf', 'çalış', 'meslek', 'meslek-ayrıl', 'para-sıralama'],
    };

    // --- 2. EMBED SAYFALARI ---
    const pages = {
        // Ana Sayfa
        'ana_sayfa': new EmbedBuilder()
            .setColor("Blurple")
            .setTitle("📚 GraveBOT Yardım Merkezi")
            .setDescription(
                `Prefix: \`g!\`\n\n**Merhaba ${message.author.username}, aşağıdaki menüden kategori seçiniz.**\n\n` +
                `**Anlık Ping:** ${pingEmoji} **${ping}ms**\n` +
                `**Destek Sunucusu:** [Buraya Tıklayın](https://discord.gg/CVZ4zEkJws)`
            )
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Komutu kullanan: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }),

        // Genel
        'genel': new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("⚙️ Genel Komutlar")
            .setDescription(formatCommands(commandLists.genel))
            .setFooter({ text: `Anlık Ping: ${ping}ms` }),

        // Kullanıcı
        'kullanici': new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("👤 Kullanıcı Komutları")
            .setDescription(formatCommands(commandLists.kullanici)),

        // Moderasyon
        'moderasyon': new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🛡️ Moderasyon Komutları")
            .setDescription(formatCommands(commandLists.moderasyon)),

        // Sistem
        'sistem': new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle("🚨 Sistem Komutları")
            .setDescription(formatCommands(commandLists.sistem)),

        // Sahip
        'sahip': new EmbedBuilder()
            .setColor(0x99aab5)
            .setTitle("👑 Sahip Komutları")
            .setDescription(formatCommands(commandLists.sahip)),

        // Eğlence
        'eğlence': new EmbedBuilder()
            .setColor(0xe91e63)
            .setTitle("🎉 Eğlence Komutları")
            .setDescription(formatCommands(commandLists.eğlence)),

        // Ekonomi
        'ekonomi': new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("💰 Ekonomi Komutları")
            .setDescription(formatCommands(commandLists.ekonomi)),
    };

    // --- 3. DROPDOWN MENÜ ---
    const menu = new StringSelectMenuBuilder()
      .setCustomId("helpMenu")
      .setPlaceholder("Lütfen kategori seçiniz!")
      .addOptions([
        { label: "Ana Sayfa", description: "Yardım menüsünün ana sayfası.", value: "ana_sayfa", emoji: "🏠" },
        { label: "Genel Komutlar", description: "Temel bot komutlarını içerir.", value: "genel", emoji: "⚙️" },
        { label: "Kullanıcı Komutları", description: "Kullanıcı tabanlı bilgi komutları.", value: "kullanici", emoji: "👤" },
        { label: "Moderasyon", description: "Sunucu yönetimi ve güvenlik komutları.", value: "moderasyon", emoji: "🛡️" },
        { label: "Sistem", description: "Otorol, küfür engeli gibi otomatik sistemler.", value: "sistem", emoji: "🚨" },
        { label: "Sahip Komutları", description: "Bot sahibine özel komutlar.", value: "sahip", emoji: "👑" },
        { label: "Eğlence", description: "Kullanıcıların eğlenmesi için komutlar.", value: "eğlence", emoji: "🎉" },
        { label: "Ekonomi", description: "Para kazanma ve harcama komutları.", value: "ekonomi", emoji: "💰" },
      ]);

    // --- 4. LİNK BUTONLARI ---
    // NOT: Link butonlarında customId olmaz, sadece URL olur!
    const linkButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🌐 Web Sitemiz")
        .setStyle(ButtonStyle.Link)
        .setURL("https://gravebot.vercel.app"), // Web site URL'si
      new ButtonBuilder()
        .setLabel("✨ Oy Ver!")
        .setStyle(ButtonStyle.Link)
        .setURL("https://top.gg/bot/1066016782827130960/vote"), // Top.gg oy linki
      new ButtonBuilder()
        .setLabel("🆘 Destek Sunucusu")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/CVZ4zEkJws"), // Destek sunucusu linki
      new ButtonBuilder()
        .setLabel("🤖 Davet Et!")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`) // Bot davet linki
    );

    const menuRow = new ActionRowBuilder().addComponents(menu);

    // --- 5. İLK MESAJI GÖNDERME ---
    const msg = await message.channel.send({
      embeds: [pages['ana_sayfa']],
      components: [menuRow, linkButtons],
    });

    // --- 6. COLLECTOR VE ETKİLEŞİM ---
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "helpMenu") {
        const selectedCategory = i.values[0];
        await i.update({ 
          embeds: [pages[selectedCategory]], 
          components: [menuRow, linkButtons] 
        });
      }
    });

    collector.on("end", async () => {
      try {
        // Menüyü devre dışı bırak
        const disabledMenu = new StringSelectMenuBuilder()
          .setCustomId("helpMenu")
          .setDisabled(true)
          .setPlaceholder("Menünün süresi doldu, komutu tekrar kullanın.")
          .addOptions(menu.options); // Orijinal seçenekleri koru

        const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
        
        const timeoutEmbed = new EmbedBuilder(pages['ana_sayfa'])
          .setDescription(`Prefix: \`g!\`\n\n⚠️ **İşlem süresi doldu.** Tekrar görüntülemek için \`g!yardım\` yazın.`)
          .setFields([]);

        await msg.edit({ 
          embeds: [timeoutEmbed], 
          components: [disabledRow, linkButtons] // Link butonları hala aktif kalır
        });
      } catch {}
    });
  } catch (err) {
    console.error("Yardım komutu hatası:", err);
    message.channel.send("⚠️ | Yardım menüsü oluşturulurken bir hata oluştu.");
  }
};

module.exports.conf = { aliases: ["help", "yardim"] };
module.exports.help = { name: "yardım" };
