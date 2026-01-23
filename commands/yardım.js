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
    // === KOMUT KATEGORİLERİ ===
    const commandLists = {
      'genel': {
        name: 'Genel Sistem',
        commands: ['ping', 'istatistik', 'uptime', 'hata-bildir', 'hatırlat', 'shard', 'yapayzeka', 'yardım'],
        icon: '⚙️',
        color: '#5865F2',
        description: 'Botun ana çekirdek komutları ve sistem araçları.'
      },
      'kullanici': {
        name: 'Kullanıcı Araçları',
        commands: ['avatar', 'profil', 'deprem', 'hesapla', 'döviz', 'rastgele-emoji', 'çeviri', 'emojiler', 'steam', 'afk', 'songörülme', 'üyesayısı', 'emoji-bilgi'],
        icon: '👤',
        color: '#57F287',
        description: 'Kullanıcı deneyimini güçlendiren profil ve bilgi komutları.'
      },
      'moderasyon': {
        name: 'Yönetim & Güvenlik',
        commands: ['ban', 'unban', 'kick', 'sil', 'herkese-rol-ver', 'herkesten-rol-al', 'rol-ver', 'rol-al', 'nuke', 'timeout', 'untimeout', 'lock', 'unlock', 'kanal-ekle', 'üyeetiket', 'kanal-sil', 'uyar'],
        icon: '🛡️',
        color: '#ED4245',
        description: 'Sunucu güvenliği ve düzeni için profesyonel araçlar.'
      },
      'sistem': {
        name: 'Gelişmiş Sistemler',
        commands: ['sayaç', 'reklam-engel', 'küfür-engel', 'caps-lock', 'botlist-kur', 'botlist-ayarla', 'anti-raid', 'kayıt-sistemi', 'sa-as', 'çekiliş', 'ticket-sistemi', 'ticket-sıfırla', 'otorol', 'ses-sistemi', 'jail-sistemi', 'emoji-log', 'modlog', 'slowmode'],
        icon: '🚨',
        color: '#FEE75C',
        description: 'Otomatik moderasyon ve sunucu yönetim sistemleri.'
      },
      'eğlence': {
        name: 'Eğlence & Sosyal',
        commands: ['ship', 'espiri', 'yazı-tura', 'burger', 'iskender', 'lahmacun', '2048', 'tweet', 'çayiç', 'zar-at'],
        icon: '🎉',
        color: '#EB459E',
        description: 'Topluluğunuzu eğlendirecek interaktif oyunlar ve komutlar.'
      },
      'ekonomi': {
        name: 'Ekonomi Dünyası',
        commands: ['param', 'günlük', 'çal', 'banka-oluştur', 'banka-transfer', 'banka-yatır', 'banka-çek', 'apara', 'cf', 'çalış', 'meslek', 'meslek-ayrıl', 'para-sıralama'],
        icon: '💰',
        color: '#2ECC71',
        description: 'Gelişmiş sanal ekonomi ve borsa yönetim sistemi.'
      },
      'sahip': {
        name: 'Geliştirici Paneli',
        commands: ['reload', 'mesaj-gönder'],
        icon: '👑',
        color: '#23272A',
        description: 'Sadece bot sahiplerinin erişebileceği yönetim komutları.'
      }
    };

    const totalCommands = Object.values(commandLists).reduce((acc, cat) => acc + cat.commands.length, 0);

    // === YARDIMCI GÖRSEL FONKSİYONLAR ===
    const createProgressBar = (percent, length = 15) => {
      const filledLength = Math.round(length * (percent / 100));
      const emptyLength = length - filledLength;
      return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
    };

    // === GLOBAL DURUM VE BİLEŞEN OLUŞTURUCU ===
    let currentCategory = 'ana_sayfa';
    let currentPage = 1;

    const getComponents = (category, page) => {
      const rows = [];

      const rowMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
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
          ])
      );
      rows.push(rowMenu);

      if (category !== 'ana_sayfa') {
        const cat = commandLists[category];
        const itemsPerPage = 12;
        const totalPages = Math.ceil(cat.commands.length / itemsPerPage);

        const rowPagination = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev_page")
            .setLabel("Geri")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("⬅️")
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId("page_info")
            .setLabel(`${page} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("next_page")
            .setLabel("İleri")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("➡️")
            .setDisabled(page >= totalPages)
        );
        rows.push(rowPagination);
      }

      const rowButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("search").setLabel("Ara").setStyle(ButtonStyle.Secondary).setEmoji("🔍"),
        new ButtonBuilder().setCustomId("stats").setLabel("Analiz").setStyle(ButtonStyle.Primary).setEmoji("📉"),
        new ButtonBuilder().setCustomId("premium").setLabel("Quantum+").setStyle(ButtonStyle.Success).setEmoji("💎"),
        new ButtonBuilder().setCustomId("delete").setLabel("Kapat").setStyle(ButtonStyle.Danger).setEmoji("🛑")
      );
      rows.push(rowButtons);

      const rowLinks = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Web Panel").setStyle(ButtonStyle.Link).setURL("https://gravebot.vercel.app").setEmoji("🌐"),
        new ButtonBuilder().setLabel("Destek Sunucusu").setStyle(ButtonStyle.Link).setURL("https://discord.gg/CVZ4zEkJws").setEmoji("🎧")
      );
      rows.push(rowLinks);

      return rows;
    };

    const getEmbed = (category = 'ana_sayfa', page = 1) => {
      const ping = client.ws.ping;

      const embed = new EmbedBuilder()
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setTimestamp()
        .setFooter({
          text: `Grave Yardım Motoru | v4.0.0 Kararlı Sürüm | ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        });

      if (category === 'ana_sayfa') {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        return embed
          .setColor('#0A0A0F')
          .setAuthor({
            name: `GRAVE YARDIM MERKEZİ`,
            iconURL: client.user.displayAvatarURL(),
            url: 'https://gravebot.vercel.app'
          })
          .setDescription(
            `### 🌌 Hoş Geldin, Sayın ${message.author.username}!\n` +
            `Sistem aktif. Menüden bir modül seçerek devam et.\n\n` +
            `\`\`\`ansi\n` +
            `\x1b[1;34m┏━━ ARAYÜZ v4.0.0 ━━┓\x1b[0m\n` +
            `\`\`\``
          )
          .addFields(
            {
              name: '📡 Sistem Özeti',
              value:
                `\`\`\`yml\n` +
                `Ping: ${ping}ms\n` +
                `Uptime: ${days}g ${hours}s ${minutes}d\n` +
                `Sunucu: ${client.guilds.cache.size}\n` +
                `Komut: ${totalCommands}\n` +
                `\`\`\``,
              inline: true
            },
            {
              name: '📂 Komutlar',
              value:
                `\`\`\`ansi\n` +
                Object.entries(commandLists).map(([key, cat]) =>
                  `\x1b[1;30m${cat.icon}\x1b[0m \x1b[1;37m${cat.name}\x1b[0m`
                ).join('  ') +
                `\`\`\``,
              inline: false
            },
            {
              name: '🚀 Linkler',
              value: `[Web](https://gravebot.vercel.app) • [Destek](https://discord.gg/CVZ4zEkJws) • [Oy Ver](https://top.gg/bot/1066016782827130960/vote)`,
              inline: false
            }
          );
      }

      // Kategori Sayfası
      const cat = commandLists[category];
      if (!cat) return embed;

      const itemsPerPage = 12;
      const totalPages = Math.ceil(cat.commands.length / itemsPerPage);
      const safePage = Math.max(1, Math.min(page, totalPages));
      const start = (safePage - 1) * itemsPerPage;
      const pageCommands = cat.commands.slice(start, start + itemsPerPage);

      return embed
        .setColor(cat.color)
        .setAuthor({
          name: `${cat.name.toUpperCase()} MODÜLÜ`,
          iconURL: client.user.displayAvatarURL()
        })
        .setDescription(
          `**${cat.description}**\n\n` +
          `\`\`\`ansi\n` +
          `\x1b[1;30m┌──\x1b[0m \x1b[1;36mSayfa ${safePage}/${totalPages}\x1b[0m\n` +
          `\x1b[1;30m└──\x1b[0m \x1b[1;33mToplam ${cat.commands.length} Komut Bulundu\x1b[0m\n` +
          `\`\`\`\n` +
          pageCommands.map((cmd, i) =>
            `**${(start + i + 1).toString().padStart(2, '0')}.** \`g!${cmd}\` - *Hazır*`
          ).join('\n') +
          `\n\n> 💡 **İpucu:** Gezinmek için aşağıdaki butonları veya menüyü kullanabilirsin.`
        )
        .addFields({
          name: '🛠️ Altyapı Sağlığı',
          value: `\`\`\`\n${createProgressBar(100)} 100% GÜVENLİ\`\`\``
        });
    };

    const mainMsg = await message.channel.send({
      embeds: [getEmbed('ana_sayfa')],
      components: getComponents('ana_sayfa', 1)
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
          await i.update({ embeds: [getEmbed(currentCategory, currentPage)], components: getComponents(currentCategory, currentPage) });
        }

        else if (i.customId === "next_page") {
          currentPage++;
          await i.update({ embeds: [getEmbed(currentCategory, currentPage)], components: getComponents(currentCategory, currentPage) });
        }

        else if (i.customId === "prev_page") {
          currentPage--;
          await i.update({ embeds: [getEmbed(currentCategory, currentPage)], components: getComponents(currentCategory, currentPage) });
        }

        else if (i.customId === "search") {
          const modal = new ModalBuilder().setCustomId("search_modal").setTitle("🔍 Kuantum Arama Algoritması");
          const input = new TextInputBuilder()
            .setCustomId("q")
            .setLabel("Hangi fonksiyona erişmek istiyorsunuz?")
            .setPlaceholder("Örn: ban, ping, borsa...")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await i.showModal(modal);

          const submit = await i.awaitModalSubmit({ time: 30000 }).catch(() => null);
          if (submit) {
            const query = submit.fields.getTextInputValue("q").toLowerCase();
            const results = [];

            for (const [id, cat] of Object.entries(commandLists)) {
              const matched = cat.commands.filter(c => c.includes(query));
              if (matched.length > 0) results.push({ name: cat.name, icon: cat.icon, cmd: matched });
            }

            const searchEmbed = new EmbedBuilder()
              .setTitle(`🔍 Arama Sonucu: "${query}"`)
              .setColor(results.length > 0 ? '#5865F2' : '#ED4245')
              .setDescription(results.length > 0
                ? `**${results.reduce((a, b) => a + b.cmd.length, 0)}** eşleşen komut bulundu.`
                : "Arama başarısız. Veri tabanında bu isimle bir kayıt bulunamadı.")
              .setTimestamp();

            if (results.length > 0) {
              results.forEach(r => {
                searchEmbed.addFields({ name: `${r.icon} ${r.name}`, value: r.cmd.map(c => `\`g!${c}\``).join(' • ') });
              });
            }

            await submit.reply({ embeds: [searchEmbed], flags: 64 });
          }
        }

        else if (i.customId === "stats") {
          const statsEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📊 GRAVE SİSTEM ANALİZİ')
            .addFields(
              { name: '🖥️ Donanım', value: `\`\`\`yml\nCPU: ${process.cpuUsage().system / 1000}ms\nRAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB\nPlatform: ${process.platform}\n\`\`\``, inline: true },
              { name: '💻 Yazılım', value: `\`\`\`yml\nDiscord.js: v14.x\nNode: ${process.version}\nShards: ${client.shard ? client.shard.count : 1}\n\`\`\``, inline: true },
              { name: '📈 Aktivite', value: `\`\`\`yml\nKomutlar: ${totalCommands}\nModüller: ${Object.keys(commandLists).length}\nSunucu: ${client.guilds.cache.size}\n\`\`\``, inline: false }
            )
            .setTimestamp();
          await i.reply({ embeds: [statsEmbed], flags: 64 });
        }

        else if (i.customId === "premium") {
          const premEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💎 GRAVE QUANTUM+')
            .setDescription('### Sınırları Zorlayın!\nQuantum+ abonesi olarak botun tüm premium özelliklerine erişim sağlayın.')
            .addFields(
              { name: '✨ Avantajlar', value: '• Özel AI Modelleri\n• Gelişmiş Loglama\n• Özel Prefix\n• Öncelikli İşleme\n• Reklamsız Deneyim', inline: true },
              { name: '💰 Abonelik', value: 'Çok Yakında!', inline: true }
            )
            .setFooter({ text: 'Quantum+ Güvenliği' });
          await i.reply({ embeds: [premEmbed], flags: 64 });
        }

        else if (i.customId === "delete") {
          await i.update({ content: "⚠️ Bağlantı kesildi. Arayüz kapatılıyor...", embeds: [], components: [] });
          setTimeout(() => mainMsg.delete().catch(() => { }), 3000);
          collector.stop();
        }

      } catch (err) {
        console.error("Interaction Hatası:", err);
      }
    });

    collector.on("end", () => {
      mainMsg.edit({ components: [] }).catch(() => { });
    });

  } catch (err) {
    console.error("Yardım Hatası:", err);
    message.channel.send("⚠️ Kritik Sistem Hatası! Lütfen geliştiriciye bildirin.");
  }
};

module.exports.conf = { aliases: ["help", "yardim", "h", "commands"] };
module.exports.help = {
  name: "yardım",
  description: "Gelişmiş Kuantum yardım arayüzü.",
  usage: "g!yardım"
};
