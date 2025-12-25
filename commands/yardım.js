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
    // Komut kategorileri
    const commandLists = {
      'genel': ['ping', 'istatistik', 'uptime', 'hata-bildir', 'hatırlat', 'shard', 'yapayzeka', 'yardım'],
      'kullanici': ['avatar', 'profil', 'deprem', 'hesapla', 'döviz', 'çeviri', 'emojiler', 'steam', 'afk', 'songörülme', 'üyesayısı', 'emoji-bilgi'],
      'moderasyon': ['ban', 'unban', 'kick', 'sil', 'herkese-rol-ver', 'herkesten-rol-al', 'rol-ver', 'rol-al', 'nuke', 'lock', 'unlock', 'kanal-ekle', 'kanal-sil', 'uyar'],
      'sistem': ['sayaç', 'reklam-engel', 'küfür-engel', 'caps-lock', 'botlist-kur', 'botlist-ayarla', 'anti-raid', 'kayıt-sistemi', 'sa-as', 'ticket-sistemi', 'ticket-sıfırla', 'otorol', 'ses-sistemi', 'jail-sistemi', 'emoji-log', 'modlog', 'slowmode'],
      'sahip': ['reload', 'mesaj-gönder'],
      'eğlence': ['ship', 'espiri', 'yazı-tura', 'burger', 'iskender', 'lahmacun', '2048', 'tweet', 'çayiç', 'zar-at'],
      'ekonomi': ['param', 'günlük', 'çal', 'banka-oluştur', 'banka-transfer', 'banka-yatır', 'banka-çek', 'apara', 'cf', 'çalış', 'meslek', 'meslek-ayrıl', 'para-sıralama'],
    };

    const totalCommands = Object.values(commandLists).reduce((acc, arr) => acc + arr.length, 0);
    const formatCommands = (list) => list.map(cmd => `\`${cmd}\``).join(" • ");

    // Dinamik Embed Oluşturucu
    const getEmbed = (category = 'ana_sayfa') => {
      const ping = client.ws.ping;
      const pingEmoji = ping > 200 ? "<:dnds:1453766771638009907>" : ping > 100 ? "<:idle:1453766850428276796>" : "<:onl:1453766738884952286>";
      
      const baseEmbed = new EmbedBuilder()
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: `${message.author.tag} tarafından istendi.`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

      switch (category) {
        case 'ana_sayfa':
          return baseEmbed
            .setColor("#5865F2")
            .setTitle("<:Information:1453765637020319872> GraveBOT Yardım Merkezi")
            .setDescription(
              `Merhaba **${message.author.username}**, ben **GraveBOT**! Aşağıdaki menüyü kullanarak komutlarımı detaylıca inceleyebilirsin.\n\n` +
              `<:ok1:1445126670687404143> **Prefix:** \`g!\`\n` +
              `<:gdev:1453777305389236418> **Toplam Komut:** \`${totalCommands}\` Adet\n` +
              `<a:ping:1416529425813737544> **Gecikme:** ${pingEmoji} \`${ping}ms\``
            );

        case 'genel':
          return baseEmbed.setColor("#5865F2").setTitle("⚙️ Genel Komutlar").setDescription(formatCommands(commandLists.genel));
        case 'kullanici':
          return baseEmbed.setColor("#57F287").setTitle("👤 Kullanıcı Komutları").setDescription(formatCommands(commandLists.kullanici));
        case 'moderasyon':
          return baseEmbed.setColor("#ED4245").setTitle("🛡️ Moderasyon Komutları").setDescription(formatCommands(commandLists.moderasyon));
        case 'sistem':
          return baseEmbed.setColor("#FEE75C").setTitle("🚨 Sistem Komutları").setDescription(formatCommands(commandLists.sistem));
        case 'sahip':
          return baseEmbed.setColor("#23272A").setTitle("👑 Sahip Komutları").setDescription(formatCommands(commandLists.sahip));
        case 'eğlence':
          return baseEmbed.setColor("#EB459E").setTitle("🎉 Eğlence Komutları").setDescription(formatCommands(commandLists.eğlence));
        case 'ekonomi':
          return baseEmbed.setColor("#2ECC71").setTitle("💰 Ekonomi Komutları").setDescription(formatCommands(commandLists.ekonomi));
      }
    };

    // Seçenek Menüsü
    const menu = new StringSelectMenuBuilder()
      .setCustomId("helpMenu")
      .setPlaceholder("📌 Bir kategori seçin...")
      .addOptions([
        { label: "Ana Sayfa", value: "ana_sayfa", emoji: "🏠" },
        { label: "Genel", value: "genel", emoji: "⚙️" },
        { label: "Kullanıcı", value: "kullanici", emoji: "👤" },
        { label: "Moderasyon", value: "moderasyon", emoji: "🛡️" },
        { label: "Sistem", value: "sistem", emoji: "🚨" },
        { label: "Eğlence", value: "eğlence", emoji: "🎉" },
        { label: "Ekonomi", value: "ekonomi", emoji: "💰" },
        { label: "Sahip", value: "sahip", emoji: "👑" },
      ]);

    // Buton Satırı
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("home_btn").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setLabel("Web Sitemiz").setStyle(ButtonStyle.Link).setURL("https://gravebot.vercel.app"),
      new ButtonBuilder().setLabel("Destek Sunucusu").setStyle(ButtonStyle.Link).setURL("https://discord.gg/CVZ4zEkJws"),
      new ButtonBuilder().setLabel("Oy Ver").setStyle(ButtonStyle.Link).setURL("https://top.gg/bot/1066016782827130960/vote"),
      new ButtonBuilder().setLabel("Davet Et").setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot`)
    );

    const menuRow = new ActionRowBuilder().addComponents(menu);

    const msg = await message.channel.send({
      embeds: [getEmbed('ana_sayfa')],
      components: [menuRow, buttons],
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 120000,
    });

    collector.on("collect", async i => {
      if (i.customId === "helpMenu") {
        await i.update({ embeds: [getEmbed(i.values[0])] });
      } else if (i.customId === "home_btn") {
        await i.update({ embeds: [getEmbed('ana_sayfa')] });
      }
    });

    collector.on("end", () => {
      const disabledMenu = new ActionRowBuilder().addComponents(menu.setDisabled(true).setPlaceholder("Menü süresi doldu."));
      msg.edit({ components: [disabledMenu, buttons] }).catch(() => {});
    });

  } catch (err) {
    console.error(err);
    message.channel.send("⚠️ Yardım menüsü açılırken bir teknik sorun oluştu.");
  }
};

module.exports.conf = { aliases: ["help", "yardim"] };
module.exports.help = { name: "yardım" };
