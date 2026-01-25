const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContainerBuilder,
  MessageFlags
} = require("discord.js");

module.exports.run = async (client, message) => {
  try {
    // === KOMUT KATEGORİLERİ (TAM) ===
    const commandLists = {
      'genel': {
        name: 'Genel Sistem',
        commands: ['ping', 'istatistik', 'uptime', 'hata-bildir', 'hatırlat', 'shard', 'yapayzeka', 'yardım'],
        icon: '⚙️',
        color: 0x5865F2,
        description: 'Botun ana çekirdek komutları ve sistem araçları.'
      },
      'kullanici': {
        name: 'Kullanıcı Araçları',
        commands: ['avatar', 'profil', 'deprem', 'hesapla', 'döviz', 'rastgele-emoji', 'çeviri', 'emojiler', 'steam', 'afk', 'songörülme', 'üyesayısı', 'emoji-bilgi'],
        icon: '👤',
        color: 0x57F287,
        description: 'Kullanıcı deneyimini güçlendiren profil ve bilgi komutları.'
      },
      'moderasyon': {
        name: 'Yönetim & Güvenlik',
        commands: ['ban', 'unban', 'kick', 'sil', 'herkese-rol-ver', 'herkesten-rol-al', 'rol-ver', 'rol-al', 'nuke', 'timeout', 'untimeout', 'lock', 'unlock', 'kanal-ekle', 'slowmode', 'kanal-sil', 'uyar'],
        icon: '🛡️',
        color: 0xED4245,
        description: 'Sunucu güvenliği ve düzeni için profesyonel araçlar.'
      },
      'sistem': {
        name: 'Gelişmiş Sistemler',
        commands: ['sayaç', 'reklam-engel', 'küfür-engel', 'caps-lock', 'botlist-kur', 'botlist-ayarla', 'anti-raid', 'kayıt-sistemi', 'sa-as', 'çekiliş', 'everyoneengel', 'ticket-sistemi', 'ticket-sıfırla', 'otorol', 'ses-sistemi', 'jail-sistemi', 'emoji-log', 'modlog', 'üyeetiket'],
        icon: '🚨',
        color: 0xFEE75C,
        description: 'Otomatik moderasyon ve sunucu yönetim sistemleri.'
      },
      'eğlence': {
        name: 'Eğlence & Sosyal',
        commands: ['ship', 'espiri', 'yazı-tura', 'burger', 'iskender', 'lahmacun', '2048', 'tweet', 'çayiç', 'zar-at'],
        icon: '🎉',
        color: 0xEB459E,
        description: 'Topluluğunuzu eğlendirecek interaktif oyunlar ve komutlar.'
      },
      'ekonomi': {
        name: 'Ekonomi Dünyası',
        commands: ['param', 'günlük', 'çal', 'banka-oluştur', 'banka-transfer', 'banka-yatır', 'banka-çek', 'apara', 'cf', 'çalış', 'meslek', 'meslek-ayrıl', 'para-sıralama'],
        icon: '💰',
        color: 0x2ECC71,
        description: 'Gelişmiş sanal ekonomi ve borsa yönetim sistemi.'
      },
      'sahip': {
        name: 'Geliştirici Paneli',
        commands: ['reload', 'mesaj-gönder'],
        icon: '👑',
        color: 0x23272A,
        description: 'Sadece bot sahiplerinin erişebileceği yönetim komutları.'
      }
    };

    const totalCommands = Object.values(commandLists).reduce((acc, cat) => acc + cat.commands.length, 0);

    // === PROGRESS BAR ===
    const createProgressBar = (percent, length = 15) => {
      const filled = Math.round(length * (percent / 100));
      return '█'.repeat(filled) + '░'.repeat(length - filled);
    };

    let currentCategory = 'ana_sayfa';
    let currentPage = 1;

    // === V2 CONTAINER GETTER ===
    const getV2Container = (category = 'ana_sayfa', page = 1) => {
      const container = new ContainerBuilder()
        .setAccentColor(category === 'ana_sayfa' ? 0x0A0A0F : (commandLists[category]?.color ?? 0x5865F2));

      if (category === 'ana_sayfa') {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const ping = client.ws.ping;

        container
          .addTextDisplayComponents(t => t.setContent(
            `### 🌌 Hoş Geldin, Sayın **${message.author.username}**!\n` +
            `Sistem aktif. Menüden bir modül seçerek devam et.\n\n` +
            `\`\`\`ansi\n┏━━ ARAYÜZ v4.0.0 ━━┓\x1b[0m\n\`\`\``
          ))
          .addTextDisplayComponents(t => t.setContent(
            `**📡 Sistem Özeti**\n` +
            `\`\`\`yml\n` +
            `Ping: ${ping}ms\n` +
            `Uptime: ${days}g ${hours}s ${minutes}d\n` +
            `Sunucu: ${client.guilds.cache.size}\n` +
            `Komut: ${totalCommands}\n` +
            `\`\`\``
          ))
          .addTextDisplayComponents(t => t.setContent(
            `**📂 Komutlar**\n` +
            `\`\`\`ansi\n` +
            Object.entries(commandLists).map(([_, cat]) => `\x1b[1;30m${cat.icon}\x1b[0m \x1b[1;37m${cat.name}\x1b[0m`).join('  ') +
            `\`\`\``
          ))
          .addTextDisplayComponents(t => t.setContent(
            `**🚀 Linkler**\n` +
            `[Web](https://gravebot.vercel.app) • [Destek](https://discord.gg/CVZ4zEkJws) • [Oy Ver](https://top.gg/bot/1066016782827130960/vote)`
          ));
      } else {
        const cat = commandLists[category];
        if (!cat) return container;

        const itemsPerPage = 12;
        const totalPages = Math.ceil(cat.commands.length / itemsPerPage);
        const safePage = Math.max(1, Math.min(page, totalPages));
        const start = (safePage - 1) * itemsPerPage;
        const pageCommands = cat.commands.slice(start, start + itemsPerPage);

        container.addTextDisplayComponents(t => t.setContent(
          `**${cat.name.toUpperCase()} MODÜLÜ**\n` +
          `**${cat.description}**\n\n` +
          `\`\`\`ansi\n┌── Sayfa ${safePage}/${totalPages}\x1b[0m\n└── Toplam ${cat.commands.length} Komut Bulundu\x1b[0m\n\`\`\`\n` +
          pageCommands.map((cmd, i) => `**${(start + i + 1).toString().padStart(2, '0')}.** \`g!${cmd}\` - *Hazır*`).join('\n') +
          `\n\n> 💡 **İpucu:** Gezinmek için aşağıdaki butonları veya menüyü kullanabilirsin.`
        ));

        container.addTextDisplayComponents(t => t.setContent(
          `**🛠️ Altyapı Sağlığı**\n` +
          `\`\`\`\n${createProgressBar(100)} 100% GÜVENLİ\`\`\``
        ));
      }

      // SELECT MENU
      const select = new StringSelectMenuBuilder()
        .setCustomId("help_select")
        .setPlaceholder("📂 Bir sistem modülü seçin...")
        .addOptions([
          { label: "Ana Kontrol Merkezi", value: "ana_sayfa", emoji: "🏠", description: "Sistem durumunu ve genel özeti görüntüleyin." },
          ...Object.entries(commandLists).map(([id, data]) => ({
            label: data.name,
            value: id,
            emoji: data.icon,
            description: `${data.commands.length} aktif komut mevcut.`
          }))
        ]);

      container.addActionRowComponents(row => row.setComponents(select));

      // PAGINATION (kategori sayfalarında)
      if (category !== 'ana_sayfa') {
        const cat = commandLists[category];
        const totalPages = Math.ceil(cat.commands.length / 12);

        container.addActionRowComponents(row => row.setComponents(
          new ButtonBuilder().setCustomId("prev_page").setLabel("Geri").setStyle(ButtonStyle.Primary).setEmoji("⬅️").setDisabled(page <= 1),
          new ButtonBuilder().setCustomId("page_info").setLabel(`${page} / ${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId("next_page").setLabel("İleri").setStyle(ButtonStyle.Primary).setEmoji("➡️").setDisabled(page >= totalPages)
        ));
      }

      // ALT BUTONLAR
      container.addActionRowComponents(row => row.setComponents(
        new ButtonBuilder().setCustomId("search").setLabel("Ara").setStyle(ButtonStyle.Secondary).setEmoji("🔍"),
        new ButtonBuilder().setCustomId("stats").setLabel("Analiz").setStyle(ButtonStyle.Primary).setEmoji("📉"),
        new ButtonBuilder().setCustomId("premium").setLabel("Quantum+").setStyle(ButtonStyle.Success).setEmoji("💎"),
        new ButtonBuilder().setCustomId("delete").setLabel("Kapat").setStyle(ButtonStyle.Danger).setEmoji("🛑")
      ));

      // LİNKLER
      container.addActionRowComponents(row => row.setComponents(
        new ButtonBuilder().setLabel("Web Panel").setStyle(ButtonStyle.Link).setURL("https://gravebot.vercel.app").setEmoji("🌐"),
        new ButtonBuilder().setLabel("Destek Sunucusu").setStyle(ButtonStyle.Link).setURL("https://discord.gg/CVZ4zEkJws").setEmoji("🎧")
      ));

      // Separator'lar
      container.addSeparatorComponents();
      container.addSeparatorComponents();

      return container;
    };

    // === GÖNDER ===
    const mainMsg = await message.channel.send({
      components: [getV2Container('ana_sayfa', 1)],
      flags: MessageFlags.IsComponentsV2
    });

    // === COLLECTOR ===
    const collector = mainMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 600000
    });

    collector.on("collect", async i => {
      try {
        if (i.customId === "help_select") {
          currentCategory = i.values[0];
          currentPage = 1;
        } else if (i.customId === "next_page") {
          currentPage++;
        } else if (i.customId === "prev_page") {
          currentPage--;
        } else if (i.customId === "search") {
          const modal = new ModalBuilder().setCustomId("search_modal").setTitle("🔍 Kuantum Arama Algoritması");
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("q")
                .setLabel("Hangi fonksiyona erişmek istiyorsunuz?")
                .setPlaceholder("Örn: ban, ping, borsa...")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );
          await i.showModal(modal);
          const submit = await i.awaitModalSubmit({ time: 30000 }).catch(() => null);
          if (submit) {
            const query = submit.fields.getTextInputValue("q").toLowerCase();
            const results = [];
            for (const [id, cat] of Object.entries(commandLists)) {
              const matched = cat.commands.filter(c => c.includes(query));
              if (matched.length) results.push({ name: cat.name, icon: cat.icon, cmd: matched });
            }
            const embed = new EmbedBuilder()
              .setTitle(`🔍 Arama Sonucu: "${query}"`)
              .setColor(results.length ? '#5865F2' : '#ED4245')
              .setDescription(results.length
                ? `**${results.reduce((a, b) => a + b.cmd.length, 0)}** eşleşen komut bulundu.`
                : "Arama başarısız.")
              .setTimestamp();
            if (results.length) {
              results.forEach(r => embed.addFields({ name: `${r.icon} ${r.name}`, value: r.cmd.map(c => `\`g!${c}\``).join(' • ') }));
            }
            await submit.reply({ embeds: [embed], ephemeral: true });
            return;
          }
          return;
        } else if (i.customId === "stats") {
          const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📊 GRAVE SİSTEM ANALİZİ')
            .addFields(
              { name: '🖥️ Donanım', value: `\`\`\`yml\nRAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB\nPlatform: ${process.platform}\n\`\`\``, inline: true },
              { name: '💻 Yazılım', value: `\`\`\`yml\nDiscord.js: v${require('discord.js').version}\nNode: ${process.version}\n\`\`\``, inline: true },
              { name: '📈 Aktivite', value: `\`\`\`yml\nKomut: ${totalCommands}\nSunucu: ${client.guilds.cache.size}\n\`\`\``, inline: false }
            )
            .setTimestamp();
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        } else if (i.customId === "premium") {
          const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💎 GRAVE QUANTUM+')
            .setDescription('Quantum+ abonesi olarak premium özelliklere erişin.')
            .addFields(
              { name: 'Avantajlar', value: '• Özel AI\n• Loglama\n• Özel Prefix\n• Reklamsız', inline: true },
              { name: 'Abonelik', value: 'Çok Yakında!', inline: true }
            );
          await i.reply({ embeds: [embed], ephemeral: true });
          return;
        } else if (i.customId === "delete") {
          // Kapat butonu FIX: Direkt delete + update
          try {
            await i.update({
              content: "⚠️ Arayüz kapatılıyor...",
              components: [],
              flags: MessageFlags.IsComponentsV2
            });
            // Kısa gecikme ile sil (V2'de update sonrası delete daha stabil)
            setTimeout(() => {
              mainMsg.delete().catch(() => { });
            }, 1500);
            collector.stop();
          } catch (deleteErr) {
            // Update başarısız olursa direkt silmeyi dene
            try {
              await mainMsg.delete().catch(() => { });
            } catch { }
            collector.stop();
          }
          return;
        }

        // Diğer butonlar (select, prev/next) için update
        await i.update({
          components: [getV2Container(currentCategory, currentPage)],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (err) {
        console.error("Interaction Hatası:", err);
        if (!i.replied && !i.deferred) {
          await i.reply({ content: "Bir hata oluştu.", ephemeral: true }).catch(() => { });
        }
      }
    });

    collector.on("end", () => {
      mainMsg.edit({ components: [], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
    });
  } catch (err) {
    console.error("Yardım Hatası:", err);
    message.channel.send("⚠️ Sistem hatası! Geliştiriciye bildir.").catch(() => { });
  }
};

module.exports.conf = { aliases: ["help", "yardim", "h", "commands"] };
module.exports.help = {
  name: "yardım",
  description: "Gelişmiş yardım arayüzü (Components V2).",
  usage: "g!yardım"
};
