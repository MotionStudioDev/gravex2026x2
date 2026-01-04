const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

module.exports.run = async (client, message) => {
  try {
    const commandLists = {
      'genel': ['ping', 'istatistik', 'uptime', 'hata-bildir', 'hatırlat', 'shard', 'yapayzeka', 'yardım'],
      'kullanici': ['avatar', 'profil', 'deprem', 'hesapla', 'döviz', 'çeviri', 'emojiler', 'steam', 'afk', 'songörülme', 'üyesayısı', 'emoji-bilgi'],
      'moderasyon': ['ban', 'unban', 'kick', 'sil', 'herkese-rol-ver', 'herkesten-rol-al', 'rol-ver', 'rol-al', 'nuke', 'lock', 'unlock', 'kanal-ekle', 'kanal-sil', 'uyar'],
      'sistem': ['sayaç', 'reklam-engel', 'küfür-engel', 'caps-lock', 'botlist-kur', 'botlist-ayarla', 'anti-raid', 'kayıt-sistemi', 'sa-as', 'çekiliş', 'ticket-sistemi', 'ticket-sıfırla', 'otorol', 'ses-sistemi', 'jail-sistemi', 'emoji-log', 'modlog', 'slowmode'],
      'sahip': ['reload', 'mesaj-gönder'],
      'eğlence': ['ship', 'espiri', 'yazı-tura', 'burger', 'iskender', 'lahmacun', '2048', 'tweet', 'çayiç', 'zar-at'],
      'ekonomi': ['param', 'günlük', 'çal', 'banka-oluştur', 'banka-transfer', 'banka-yatır', 'banka-çek', 'apara', 'cf', 'çalış', 'meslek', 'meslek-ayrıl', 'para-sıralama'],
    };

    const totalCommands = Object.values(commandLists).reduce((acc, arr) => acc + arr.length, 0);
    const formatCommands = (list) => list.map(cmd => `\`${cmd}\``).join(" • ");

    const getEmbed = (category = 'ana_sayfa') => {
      const ping = client.ws.ping;
      const pingStatus = ping < 100 ? "⚡ Mükemmel" : ping < 200 ? "🟢 İyi" : "🟡 Orta";
      
      const baseEmbed = new EmbedBuilder()
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: `${message.author.tag} • Grave Yardım Sistemi`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

      switch (category) {
        case 'ana_sayfa':
          return baseEmbed
            .setColor("#2b2d31")
            .setAuthor({ name: `GraveBOT Yardım Menüsü`, iconURL: client.user.displayAvatarURL() })
            .setDescription(
              `### Bot İstatistik ve Kontrol Paneli\n` +
              `Selam **${message.author.username}**, GraveBOT senin için her şeyi hazırladı. Aşağıdan bir kategori seçerek komutları listeleyebilirsin.\n\n` +
              `**Sistem Durumu:** \`${pingStatus} (${ping}ms)\`\n` +
              `**Komut Havuzu:** \`[${totalCommands} Adet]\``
            )
            .addFields(
              { 
                name: '<:folder:1453765637020319872> Komut Yönetimi', 
                value: 
                  `▫️ **Genel:** \`[${commandLists.genel.length}]\`  ▫️ **Moderasyon:** \`[${commandLists.moderasyon.length}]\` \n` +
                  `▫️ **Sistem:** \`[${commandLists.sistem.length}]\`  ▫️ **Kullanıcı:** \`[${commandLists.kullanici.length}]\` \n` +
                  `▫️ **Eğlence:** \`[${commandLists.eğlence.length}]\`  ▫️ **Ekonomi:** \`[${commandLists.ekonomi.length}]\``, 
                inline: false 
              },
              { 
                name: '🛡️ Güvenlik & Kayıt', 
                value: `┃ \`Anti-Raid\`\n┃ \`Reklam-Engel\`\n┃ \`Kayıt-Sistemi\`\n┃ \`Mod-Log\``, inline: true 
              },
              { 
                name: '💎 Sevilen Servisler', 
                value: `┃ \`Yapay Zeka (Devre Dışı)\`\n┃ \`Ticket-Sistemi\`\n┃ \`Otorol\`\n┃ \`Ses-Sistemi\``, inline: true 
              },
              {
                name: '📈 Gelişim Çubuğu',
                value: `▰▰▰▰▱▱▱▱ %60 [V3 Beta]`
              }
            );

        case 'genel': return baseEmbed.setColor("#5865F2").setTitle("⚙️ Genel Komutlar").setDescription(formatCommands(commandLists.genel));
        case 'kullanici': return baseEmbed.setColor("#57F287").setTitle("👤 Kullanıcı Komutları").setDescription(formatCommands(commandLists.kullanici));
        case 'moderasyon': return baseEmbed.setColor("#ED4245").setTitle("🛡️ Moderasyon Komutları").setDescription(formatCommands(commandLists.moderasyon));
        case 'sistem': return baseEmbed.setColor("#FEE75C").setTitle("🚨 Sistem Komutları").setDescription(formatCommands(commandLists.sistem));
        case 'sahip': return baseEmbed.setColor("#23272A").setTitle("👑 Sahip Komutları").setDescription(formatCommands(commandLists.sahip));
        case 'eğlence': return baseEmbed.setColor("#EB459E").setTitle("🎉 Eğlence Komutları").setDescription(formatCommands(commandLists.eğlence));
        case 'ekonomi': return baseEmbed.setColor("#2ECC71").setTitle("💰 Ekonomi Komutları").setDescription(formatCommands(commandLists.ekonomi));
      }
    };

    const menu = new StringSelectMenuBuilder()
      .setCustomId("helpMenu")
      // Emoji buraya geri eklendi kral:
      .setPlaceholder("Buradan bir kategori seçerek ilerle...")
      .addOptions([
        { label: "Ana Sayfa", description: "Botun genel durumu ve özet.", value: "ana_sayfa", emoji: "🏠" },
        { label: "Genel", description: "Botun temel komutlarını listeler.", value: "genel", emoji: "⚙️" },
        { label: "Kullanıcı", description: "Üyeler için profil ve araç komutları.", value: "kullanici", emoji: "👤" },
        { label: "Moderasyon", description: "Yetkililer için yönetim komutları.", value: "moderasyon", emoji: "🛡️" },
        { label: "Sistem", description: "Sunucu koruma ve ayar sistemleri.", value: "sistem", emoji: "🚨" },
        { label: "Eğlence", description: "Eğlenceli ve oyun komutları.", value: "eğlence", emoji: "🎉" },
        { label: "Ekonomi", description: "Para ve borsa sistemleri.", value: "ekonomi", emoji: "💰" },
      ]);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Web Site").setStyle(ButtonStyle.Link).setURL("https://gravebot.vercel.app"),
      new ButtonBuilder().setLabel("Destek").setStyle(ButtonStyle.Link).setURL("https://discord.gg/CVZ4zEkJws"),
      new ButtonBuilder().setCustomId("search_btn").setEmoji("1454768274720952444").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setLabel("Oy Ver").setStyle(ButtonStyle.Link).setURL("https://top.gg/bot/1066016782827130960/vote"),
      new ButtonBuilder().setLabel("Davet Et").setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot`)
    );

    const msg = await message.channel.send({
      embeds: [getEmbed('ana_sayfa')],
      components: [new ActionRowBuilder().addComponents(menu), buttons],
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 240000,
    });

    collector.on("collect", async i => {
      if (i.customId === "helpMenu") {
        await i.update({ embeds: [getEmbed(i.values[0])] });
      } else if (i.customId === "search_btn") {
        const modal = new ModalBuilder().setCustomId("s_mdl").setTitle("GraveOS Smart Search");
        const input = new TextInputBuilder().setCustomId("q").setLabel("Komut veya Kategori Adı?").setStyle(TextInputStyle.Short).setPlaceholder("Örn: ping").setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await i.showModal(modal);

        const submitted = await i.awaitModalSubmit({ time: 30000 }).catch(() => null);
        if (submitted) {
          const query = submitted.fields.getTextInputValue("q").toLowerCase();
          const found = Object.entries(commandLists).find(([_, list]) => list.includes(query));
          
          const resultEmbed = new EmbedBuilder().setTimestamp().setFooter({ text: "Grave Arama Sonucu" });

          if (found) {
            resultEmbed.setColor("#57F287")
              .setTitle("🔍 Komut Bulundu!")
              .setDescription(`**Sorgu:** \`${query}\`\n**Kategori:** \`${found[0].toUpperCase()}\`\n\nKomutu kullanmak için: \`g!${query}\``);
          } else {
            resultEmbed.setColor("#ED4245")
              .setTitle("❌ Sonuç Yok")
              .setDescription(`**\`${query}\`** adında bir komut veritabanımızda bulunamadı.`);
          }
          await submitted.reply({ embeds: [resultEmbed], ephemeral: true });
        }
      }
    });

    collector.on("end", () => {
      msg.edit({ components: [] }).catch(() => {});
    });

  } catch (err) {
    console.error(err);
    message.channel.send("⚠️ Dashboard başlatılırken bir hata oluştu.");
  }
};

module.exports.conf = { aliases: ["help", "yardim"] };
module.exports.help = { name: "yardım" };
