const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

module.exports.run = async (client, message) => {
  try {
    // Ping durumu (Daha önce yaptığınız gibi)
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
        'genel': ['ping', 'istatistik', 'uptime', 'hata-bildir', 'hatırlat', 'yapay-zeka',  'yardım'],
        'kullanici': ['avatar', 'profil', 'deprem', 'döviz', 'çeviri', 'emojiler', 'steam', 'emoji-bilgi'],
        'moderasyon': ['ban', 'unban', 'kick', 'sil', 'herkese-rol-ver', 'herkesten-rol-al', 'rol-ver','rol-al', 'nuke', 'lock', 'unlock', 'kanal-ekle', 'kanal-sil', 'uyar'],
        'sistem': ['sayaç', 'reklam-engel', 'küfür-engel', 'caps-lock', 'botlist-kur', 'botlist-ayarla', 'anti-raid', 'kayıt-sistemi', 'sa-as', 'ticket-sistemi',  'otorol', 'ses-sistemi', 'jail-sistemi', 'emoji-log', 'sayaç', 'slowmode'],
        'sahip': ['reload', 'mesaj-gönder'],
        'eğlence': ['ship', 'espiri', 'yazı-tura', 'burger', 'iskender', 'lahmacun', 'zar-at'],
        'ekonomi': ['param', 'günlük', 'çal', 'banka-oluştur', 'banka-transfer', 'banka-yatır', 'banka-çek', 'apara', 'cf', 'çalış', 'meslek', 'meslek-ayrıl', 'para-sıralama'],
    };


    // --- 2. EMBED SAYFALARI (Daha düzenli hale getirildi) ---
    const pages = {
        // Ana Sayfa
        'ana_sayfa': new EmbedBuilder()
            .setColor("Blurple")
            .setTitle("📚 GraveBOT Yardım Merkezi")
            .setDescription(
                `Prefix: \`g!\`\n\n**Merhaba ${message.author.username}, aşağıdaki menüden kategori seçiniz.**\n\n` +
                `**Anlık Ping:** ${pingEmoji} **${ping}ms**\n` +
                `**Destek Sunucusu:** [Buraya Tıklayın](https://discord.gg/CVZ4zEkJws)` // Varsayımsal destek linki
            )
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true })) // Bot avatarı eklendi
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

    // --- 3. DROPDOWN MENÜ OLUŞTURMA (Emojiler Eklendi) ---
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

    const row = new ActionRowBuilder().addComponents(menu);

    // --- 4. İLK MESAJI GÖNDERME ---
    const msg = await message.channel.send({
      embeds: [pages['ana_sayfa']],
      components: [row],
    });

    // --- 5. COLLECTOR VE ETKİLEŞİM ---
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id, // Sadece komutu kullanan cevap verebilir
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "helpMenu") {
        const selectedCategory = i.values[0];
        // Seçilen kategoriye ait embed'i günceller
        await i.update({ embeds: [pages[selectedCategory]], components: [row] });
      }
    });

    collector.on("end", async () => {
      try {
        // Süre dolduğunda menüyü devre dışı bırakır
        const disabledRow = new ActionRowBuilder().addComponents(
          StringSelectMenuBuilder.from(menu)
                .setDisabled(true)
                .setPlaceholder("Menünün süresi doldu, komutu tekrar kullanın.")
        );
        const timeoutEmbed = new EmbedBuilder(pages['ana_sayfa']) // Ana sayfanın rengini ve başlığını kullan
            .setDescription(`Prefix: \`g!\`\n\n⚠️ **İşlem süresi doldu.** Tekrar görüntülemek için \`g!yardım\` yazın.`)
            .setFields([]); // Eski Fieldsları temizle

        await msg.edit({ embeds: [timeoutEmbed], components: [disabledRow] });
      } catch {}
    });
  } catch (err) {
    console.error("Yardım komutu hatası:", err);
    message.channel.send("⚠️ | Yardım menüsü oluşturulurken bir hata oluştu.");
  }
};

module.exports.conf = { aliases: ["help", "yardim"] };
module.exports.help = { name: "yardım" };
