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
        commands: ['ping', 'istatistik', 'uptime', 'hata-bildir', 'hatırlat', 'shard', 'yapayzeka', 'yardım'],
        icon: '⚙️',
        color: '#5865F2',
        description: 'Botun temel ve genel kullanım komutları'
      },
      'kullanici': {
        commands: ['avatar', 'profil', 'deprem', 'hesapla', 'döviz', 'rastgele-emoji', 'çeviri', 'emojiler', 'steam', 'afk', 'songörülme', 'üyesayısı', 'emoji-bilgi'],
        icon: '👤',
        color: '#57F287',
        description: 'Kullanıcı profil ve bilgi komutları'
      },
      'moderasyon': {
        commands: ['ban', 'unban', 'kick', 'sil', 'herkese-rol-ver', 'herkesten-rol-al', 'rol-ver', 'rol-al', 'nuke', 'timeout', 'untimeout', 'lock', 'unlock', 'kanal-ekle', 'üyeetiket', 'kanal-sil', 'uyar'],
        icon: '🛡️',
        color: '#ED4245',
        description: 'Sunucu yönetimi ve moderasyon araçları'
      },
      'sistem': {
        commands: ['sayaç', 'reklam-engel', 'küfür-engel', 'caps-lock', 'botlist-kur', 'botlist-ayarla', 'anti-raid', 'kayıt-sistemi', 'sa-as', 'çekiliş', 'ticket-sistemi', 'ticket-sıfırla', 'otorol', 'ses-sistemi', 'jail-sistemi', 'emoji-log', 'modlog', 'slowmode'],
        icon: '🚨',
        color: '#FEE75C',
        description: 'Gelişmiş sunucu otomasyon sistemleri'
      },
      'sahip': {
        commands: ['reload', 'mesaj-gönder'],
        icon: '👑',
        color: '#23272A',
        description: 'Bot sahibine özel komutlar'
      },
      'eğlence': {
        commands: ['ship', 'espiri', 'yazı-tura', 'burger', 'iskender', 'lahmacun', '2048', 'tweet', 'çayiç', 'zar-at'],
        icon: '🎉',
        color: '#EB459E',
        description: 'Eğlence ve oyun komutları'
      },
      'ekonomi': {
        commands: ['param', 'günlük', 'çal', 'banka-oluştur', 'banka-transfer', 'banka-yatır', 'banka-çek', 'apara', 'cf', 'çalış', 'meslek', 'meslek-ayrıl', 'para-sıralama'],
        icon: '💰',
        color: '#2ECC71',
        description: 'Ekonomi ve para yönetim sistemi'
      }
    };

    const totalCommands = Object.values(commandLists).reduce((acc, cat) => acc + cat.commands.length, 0);
    const formatCommands = (list) => {
      if (list.length === 0) return '`Komut bulunamadı`';
      return list.map(cmd => `\`${cmd}\``).join(' • ');
    };

    // === EMBED OLUŞTURMA FONKSİYONU ===
    const getEmbed = (category = 'ana_sayfa', page = 1) => {
      const ping = client.ws.ping;
      const pingColor = ping < 100 ? '🟢' : ping < 200 ? '🟡' : '🔴';
      const pingStatus = ping < 100 ? "Mükemmel" : ping < 200 ? "İyi" : "Orta";

      const baseEmbed = new EmbedBuilder()
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setTimestamp()
        .setFooter({
          text: `${message.author.tag} tarafından istendi • Grave Help System v3.0`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        });

      if (category === 'ana_sayfa') {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        return baseEmbed
          .setColor('#0D1117')
          .setAuthor({
            name: `GraveBOT Quantum Dashboard`,
            iconURL: client.user.displayAvatarURL(),
            url: 'https://gravebot.vercel.app'
          })
          .setTitle('🔮 Ana Kontrol Paneli')
          .setDescription(
            `### Hoş Geldin ${message.author.username}! 👋\n` +
            `**GraveBOT** senin için her şeyi hazır. Aşağıdaki menüden bir kategori seçerek komutları keşfedebilirsin.\n\n` +
            `\`\`\`ansi\n` +
            `\x1b[1;36m╔══════════════════════════════════╗\x1b[0m\n` +
            `\x1b[1;36m║\x1b[0m  GRAVE YARDIM SİSTEMİ v3.0  \x1b[1;36m║\x1b[0m\n` +
            `\x1b[1;36m╚══════════════════════════════════╝\x1b[0m\n\`\`\``
          )
          .addFields(
            {
              name: '📊 Sistem Durum Raporu',
              value:
                `\`\`\`yml\n` +
                `Ping: ${pingColor} ${ping}ms (${pingStatus})\n` +
                `Sunucular: ${client.guilds.cache.size} Aktif\n` +
                `Kullanıcılar: ${client.users.cache.size} Kayıtlı\n` +
                `Uptime: ${days}g ${hours}s ${minutes}d\n` +
                `Node: ${process.version}\n` +
                `\`\`\``,
              inline: false
            },
            {
              name: '🗂️ Komut Kategorileri',
              value:
                `\`\`\`diff\n` +
                `+ Genel........: ${commandLists.genel.commands.length} komut\n` +
                `+ Kullanıcı....: ${commandLists.kullanici.commands.length} komut\n` +
                `+ Moderasyon...: ${commandLists.moderasyon.commands.length} komut\n` +
                `+ Sistem.......: ${commandLists.sistem.commands.length} komut\n` +
                `+ Eğlence......: ${commandLists.eğlence.commands.length} komut\n` +
                `+ Ekonomi......: ${commandLists.ekonomi.commands.length} komut\n` +
                `= TOPLAM.......: ${totalCommands} komut\n` +
                `\`\`\``,
              inline: true
            },
            {
              name: '🛡️ Premium Özellikler',
              value:
                `\`\`\`css\n` +
                `[✓] Anti-Raid Koruması\n` +
                `[✓] Yapay Zeka Destekli Sohbet\n` +
                `[✓] Gelişmiş Moderasyon\n` +
                `[✓] Özel Ekonomi\n` +
                `[✓] Ticket Sistemi\n` +
                `[✓] Otomatik Moderasyon\n` +
                `\`\`\``,
              inline: true
            },
            {
              name: '🚀 Hızlı Başlangıç',
              value:
                `> **Komut Prefix:** \`g!\`\n` +
                `> **Örnek Kullanım:** \`g!ping\`\n` +
                `> **Arama Yap:** 🔍 Butonu\n` +
                `> **Destek:** [Discord Server](https://discord.gg/CVZ4zEkJws)`,
              inline: false
            },
            {
              name: '📈 Geliştirme Durumu',
              value: `\`\`\`\n${'█'.repeat(14)}${'░'.repeat(6)} 71% [v3.0 Beta]\`\`\``,
              inline: false
            }
          )
          .setImage('https://cdn.discordapp.com/attachments/1457353514337570952/1463848967677677709/standard.gif?ex=69735316&is=69720196&hm=03a70624d3c9ddb9c040501847136dcb0cc9652387c0caf48d44882d41b54d3a&'); // Buraya banner ekleyebilirsin
      }

      // Kategori sayfaları
      const catData = commandLists[category];
      if (!catData) return baseEmbed;

      const itemsPerPage = 15;
      const startIdx = (page - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const pageCommands = catData.commands.slice(startIdx, endIdx);
      const totalPages = Math.ceil(catData.commands.length / itemsPerPage);

      return baseEmbed
        .setColor(catData.color)
        .setAuthor({
          name: `${catData.icon} ${category.charAt(0).toUpperCase() + category.slice(1)} Komutları`,
          iconURL: client.user.displayAvatarURL()
        })
        .setTitle(`📚 Kategori: ${category.toUpperCase()}`)
        .setDescription(
          `**${catData.description}**\n\n` +
          `\`\`\`ansi\n` +
          `\x1b[1;33mToplam ${catData.commands.length} komut mevcut\x1b[0m\n` +
          `\x1b[0;36mSayfa ${page}/${totalPages}\x1b[0m\n` +
          `\`\`\`\n\n` +
          `${pageCommands.map((cmd, i) =>
            `**${startIdx + i + 1}.** \`g!${cmd}\``
          ).join('\n')}`
        )
        .addFields(
          {
            name: '💡 Kullanım İpucu',
            value: `> Detaylı bilgi için: \`g!${pageCommands[0]} --help\`\n> Hızlı arama: 🔍 Arama butonunu kullan`,
            inline: false
          }
        );
    };

    // === SELECT MENU ===
    const menu = new StringSelectMenuBuilder()
      .setCustomId("helpMenu")
      .setPlaceholder("📋 Bir kategori seçin...")
      .addOptions([
        {
          label: "🏠 Ana Sayfa",
          description: "Dashboard ve genel bilgiler",
          value: "ana_sayfa",
          emoji: "🏠",
          default: true
        },
        {
          label: "⚙️ Genel",
          description: `${commandLists.genel.commands.length} temel komut`,
          value: "genel",
          emoji: "⚙️"
        },
        {
          label: "👤 Kullanıcı",
          description: `${commandLists.kullanici.commands.length} kullanıcı aracı`,
          value: "kullanici",
          emoji: "👤"
        },
        {
          label: "🛡️ Moderasyon",
          description: `${commandLists.moderasyon.commands.length} yönetim komutu`,
          value: "moderasyon",
          emoji: "🛡️"
        },
        {
          label: "🚨 Sistem",
          description: `${commandLists.sistem.commands.length} sistem aracı`,
          value: "sistem",
          emoji: "🚨"
        },
        {
          label: "🎉 Eğlence",
          description: `${commandLists.eğlence.commands.length} eğlence komutu`,
          value: "eğlence",
          emoji: "🎉"
        },
        {
          label: "💰 Ekonomi",
          description: `${commandLists.ekonomi.commands.length} ekonomi komutu`,
          value: "ekonomi",
          emoji: "💰"
        },
      ]);

    // === BUTONLAR ===
    const linkButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Web Site")
        .setStyle(ButtonStyle.Link)
        .setURL("https://gravebot.vercel.app")
        .setEmoji('🌐'),
      new ButtonBuilder()
        .setLabel("Destek Sunucusu")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/CVZ4zEkJws")
        .setEmoji('💬'),
      new ButtonBuilder()
        .setLabel("Oy Ver")
        .setStyle(ButtonStyle.Link)
        .setURL("https://top.gg/bot/1066016782827130960/vote")
        .setEmoji('⭐'),
      new ButtonBuilder()
        .setLabel("Davet Et")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot`)
        .setEmoji('➕')
    );

    const actionButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("search_btn")
        .setLabel("Komut Ara")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔍'),
      new ButtonBuilder()
        .setCustomId("refresh_btn")
        .setLabel("Yenile")
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId("stats_btn")
        .setLabel("İstatistikler")
        .setStyle(ButtonStyle.Success)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId("premium_btn")
        .setLabel("Premium")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💎'),
      new ButtonBuilder()
        .setCustomId("close_btn")
        .setLabel("Kapat")
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️')
    );

    const msg = await message.channel.send({
      embeds: [getEmbed('ana_sayfa')],
      components: [new ActionRowBuilder().addComponents(menu), actionButtons, linkButtons],
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 300000, // 5 dakika
    });

    let currentCategory = 'ana_sayfa';
    let currentPage = 1;

    collector.on("collect", async i => {
      try {
        // Select Menu
        if (i.customId === "helpMenu") {
          currentCategory = i.values[0];
          currentPage = 1;
          await i.update({ embeds: [getEmbed(currentCategory, currentPage)] });
        }

        // Arama Butonu
        else if (i.customId === "search_btn") {
          const modal = new ModalBuilder()
            .setCustomId("search_modal")
            .setTitle("🔍 Grave Akıllı Arama");

          const input = new TextInputBuilder()
            .setCustomId("search_query")
            .setLabel("Aramak istediğiniz komutu yazın")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Örn: ping, avatar, ban...")
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(50);

          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await i.showModal(modal);

          const submitted = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
          if (submitted) {
            const query = submitted.fields.getTextInputValue("search_query").toLowerCase().trim();

            // Tüm kategorilerde ara
            const results = [];
            for (const [catName, catData] of Object.entries(commandLists)) {
              const matches = catData.commands.filter(cmd => cmd.includes(query));
              if (matches.length > 0) {
                results.push({ category: catName, commands: matches, icon: catData.icon });
              }
            }

            const resultEmbed = new EmbedBuilder()
              .setColor(results.length > 0 ? '#57F287' : '#ED4245')
              .setAuthor({
                name: 'Grave Arama Sonuçları',
                iconURL: client.user.displayAvatarURL()
              })
              .setTimestamp()
              .setFooter({ text: `Aranan: "${query}" • ${results.reduce((acc, r) => acc + r.commands.length, 0)} sonuç bulundu` });

            if (results.length > 0) {
              resultEmbed
                .setTitle('✅ Komutlar Bulundu')
                .setDescription(`**"${query}"** araması için ${results.reduce((acc, r) => acc + r.commands.length, 0)} sonuç bulundu:`)
                .addFields(
                  results.map(r => ({
                    name: `${r.icon} ${r.category.charAt(0).toUpperCase() + r.category.slice(1)}`,
                    value: r.commands.map(cmd => `\`g!${cmd}\``).join(' • '),
                    inline: false
                  }))
                );
            } else {
              resultEmbed
                .setTitle('❌ Sonuç Bulunamadı')
                .setDescription(`**"${query}"** için herhangi bir komut bulunamadı.\n\n**Öneriler:**\n• Yazım hatası kontrol edin\n• Daha kısa anahtar kelime kullanın\n• Ana menüden kategorilere göz atın`);
            }

            await submitted.reply({ embeds: [resultEmbed], flags: 64 });
          }
        }

        // Yenile Butonu
        else if (i.customId === "refresh_btn") {
          await i.update({ embeds: [getEmbed(currentCategory, currentPage)] });
        }

        // İstatistikler Butonu
        else if (i.customId === "stats_btn") {
          const statsEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('Detaylı Bot İstatistikleri')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
              {
                name: '🌐 Discord Metrikleri',
                value: `\`\`\`yaml\nSunucular: ${client.guilds.cache.size}\nKullanıcılar: ${client.users.cache.size}\nKanallar: ${client.channels.cache.size}\n\`\`\``,
                inline: true
              },
              {
                name: '💻 Sistem Bilgileri',
                value: `\`\`\`yaml\nPing: ${client.ws.ping}ms\nRAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\nNode: ${process.version}\n\`\`\``,
                inline: true
              },
              {
                name: '📦 Komut İstatistikleri',
                value: `\`\`\`yaml\nToplam: ${totalCommands}\nKategoriler: ${Object.keys(commandLists).length}\nEn Fazla: Sistem (${commandLists.sistem.commands.length})\n\`\`\``,
                inline: true
              }
            )
            .setFooter({ text: 'Grave' })
            .setTimestamp();

          await i.reply({ embeds: [statsEmbed], flags: 64 });
        }

        // Premium Butonu
        else if (i.customId === "premium_btn") {
          const premiumEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💎 Grave Premium')
            .setDescription('**Premium özellikleri ile botun tüm gücünü ortaya çıkarın!**')
            .addFields(
              {
                name: '✨ Premium Özellikler',
                value:
                  '```diff\n' +
                  '+ Özel AI Modelleri\n' +
                  '+ Öncelikli Destek\n' +
                  '+ Özel Komutlar\n' +
                  '+ Reklamsız Deneyim\n' +
                  '+ Gelişmiş İstatistikler\n' +
                  '```',
                inline: false
              },
              {
                name: '💰 Fiyatlandırma',
                value: '`Yakında duyurulacak!`',
                inline: true
              },
              {
                name: '📞 İletişim',
                value: '[Destek Sunucusu](https://discord.gg/CVZ4zEkJws)',
                inline: true
              }
            )
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Grave Premium' })
            .setTimestamp();

          await i.reply({ embeds: [premiumEmbed], flags: 64 });
        }

        // Kapat Butonu
        else if (i.customId === "close_btn") {
          const closeEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✅ Menü Kapatıldı')
            .setDescription('Yardım menüsü başarıyla kapatıldı.\n\nTekrar kullanmak için: `g!yardım`')
            .setFooter({ text: 'GraveBOT • Teşekkürler!' })
            .setTimestamp();

          await i.update({ embeds: [closeEmbed], components: [] });
          collector.stop();
        }

      } catch (err) {
        console.error('Interaction hatası:', err);
        if (!i.replied && !i.deferred) {
          await i.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Bir hata oluştu. Lütfen tekrar deneyin.')
            ],
            flags: 64
          }).catch(() => { });
        }
      }
    });

    collector.on("end", () => {
      msg.edit({ components: [] }).catch(() => { });
    });

  } catch (err) {
    console.error('Yardım komutu hatası:', err);
    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⚠️ Kritik Hata')
          .setDescription('Dashboard başlatılırken bir hata oluştu.\n\nLütfen daha sonra tekrar deneyin.')
          .setFooter({ text: 'Grave Error Handler' })
          .setTimestamp()
      ]
    });
  }
};

module.exports.conf = { aliases: ["help", "yardim", "h", "commands"] };
module.exports.help = {
  name: "yardım",
  description: "Ultra premium yardım ve komut listesi sistemi",
  usage: "g!yardım [kategori]"
};
