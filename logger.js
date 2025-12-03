const { EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = (client) => {
  const logKanalId = '1441487124686700746'; // Log kanalının ID'si
  const startTime = Date.now();

  // Log gönderme fonksiyonunu cache'ten hızlıca alacak şekilde düzenleyelim.
  const sendLog = (embed) => {
    const kanal = client.channels.cache.get(logKanalId);
    if (kanal) kanal.send({ embeds: [embed] }).catch(err => console.error("Log gönderilemedi:", err));
  };
  
// --- Bot Açılış ve Sistem Bilgileri ---
  client.on('ready', async () => {
    const totalShards = client.shard?.count ?? 1;
    const memoryUsageMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const cpuModel = os.cpus()[0].model.replace(/\s+/g, ' '); // Birden fazla boşluğu temizle
    const cpuCores = os.cpus().length;

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ GraveBOT Başarıyla Başlatıldı')
      .setDescription(`Bot **${client.user.tag}** aktif edildi ve tüm sistemler kontrol edildi.`)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
            // ------------------ SHARD VE UPTIME ------------------
        { name: '🌐 Shard Durumu', value: `**${totalShards}** Shard ile çalışıyor.`, inline: true },
        { name: '⏱ Başlangıç Zamanı', value: `<t:${Math.floor(startTime/1000)}:R>`, inline: true },
            { name: '\u200B', value: '\u200B', inline: false }, // Boş Satır

            // ------------------ SİSTEM BİLGİLERİ ------------------
        { name: '🧠 RAM Kullanımı (Bot)', value: `**${memoryUsageMB} MB** / ${totalMemGB} GB`, inline: true },
        { name: '💻 İşletim Sistemi', value: `${os.platform()} (${os.arch()})`, inline: true },
        { name: '⚙️ CPU Bilgisi', value: `\`${cpuModel}\` (${cpuCores} Çekirdek)`, inline: false }
      )
      .setTimestamp();

    sendLog(embed);
  });

// --- Shard Yaşam Döngüsü Olayları ---

  // ✅ Shard oluşturulduğunda
  client.on('shardCreate', async shard => {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle(`🟢 Shard ${shard.id} oluşturuluyor`)
      .setDescription(`Shard **${shard.id}** başlatılıyor.`)
      .setTimestamp();

    sendLog(embed);
  });

  // ✅ Shard hazır olduğunda
  client.on('shardReady', async shardId => {
    // Tüm sunucu/kullanıcı sayısını broadcastEval ile almak daha karmaşıktır.
    // Sadece bu shard'ın sayısını gösterebiliriz veya toplam sayıyı sonradan güncelleyebiliriz.
    // Şimdilik sadece hazır olduğunu loglayalım:
    
    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle(`✅ Shard ${shardId} Hazır`)
      .setDescription(`Shard **${shardId}** başarıyla Discord'a bağlandı ve komut almaya hazır.`)
      .setTimestamp();

    sendLog(embed);
  });

  // ❌ Shard hata aldığında
  client.on('shardError', async (error, shardId) => {
    const embed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle(`🔴 Shard ${shardId} Kritik Hata Aldı`)
      .setDescription(`\`\`\`js\n${error.message.substring(0, 1000) || error}\n\`\`\``) // Hata mesajını kırp
      .setTimestamp();

    sendLog(embed);
  });
  
  // 🔌 Shard bağlantısı koptuğunda
  client.on('shardDisconnect', async (event, shardId) => {
    const embed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle(`🔌 Shard ${shardId} Bağlantısı Koptu`)
      .setDescription(`Shard **${shardId}** Discord'dan ayrıldı.\n**Kod:** ${event.code} - **Sebep:** ${event.reason || 'Bilinmiyor'}`)
      .setTimestamp();

    sendLog(embed);
  });

  // 🔄 Shard Yeniden Bağlanmaya Çalıştığında
  client.on('shardReconnecting', async shardId => {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(`🔄 Shard ${shardId} Yeniden Bağlanıyor`)
      .setDescription(`Shard **${shardId}** bağlantıyı kaybetmiş olabilir. Tekrar bağlanmayı deniyor...`)
      .setTimestamp();

    sendLog(embed);
  });
  
  // 🟢 Shard Yeniden Bağlantıyı Kurduğunda (Resume)
  client.on('shardResume', async (shardId, replayedEvents) => {
    const embed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle(`🟢 Shard ${shardId} Bağlantıyı Kurtardı (Resume)`)
      .setDescription(`Shard **${shardId}** bağlantıyı kurtardı ve veri kaybı önlendi. Yakalanan olay sayısı: **${replayedEvents}**`)
      .setTimestamp();

    sendLog(embed);
  });

};
