const { EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = (client) => {
  const logKanalId = '1441487124686700746'; // Log kanalının ID'si
  const startTime = Date.now();

  const sendLog = async (embed) => {
    const kanal = await client.channels.fetch(logKanalId).catch(() => null);
    if (kanal) kanal.send({ embeds: [embed] });
  };

  // ✅ Bot açıldığında
  client.on('ready', async () => {
    const totalShards = client.shard?.count ?? 1;
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const cpuModel = os.cpus()[0].model;
    const cpuCores = os.cpus().length;

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Bot Açıldı')
      .setDescription(`Bot **${client.user.tag}** başarıyla giriş yaptı.\nToplam Shard: **${totalShards}**`)
      .addFields(
        { name: 'Process ID', value: `${process.pid}`, inline: true },
        { name: 'Parent PID', value: `${process.ppid}`, inline: true },
        { name: 'Platform', value: os.platform(), inline: true },
        { name: 'Mimari', value: os.arch(), inline: true },
        { name: 'Başlangıç Zamanı', value: `<t:${Math.floor(startTime/1000)}:F>`, inline: false },
        { name: 'RAM Kullanımı', value: `${memoryUsage} MB / ${totalMem} GB`, inline: false },
        { name: 'CPU', value: `${cpuModel} (${cpuCores} çekirdek)`, inline: false }
      )
      .setTimestamp();

    sendLog(embed);
  });

  // ✅ Shard oluşturulduğunda
  client.on('shardCreate', async shard => {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle(`🟢 Shard ${shard.id} oluşturuldu`)
      .setDescription(`Shard ${shard.id} başarıyla başlatıldı.`)
      .setTimestamp();

    sendLog(embed);
  });

  // ✅ Shard hazır olduğunda
  client.on('shardReady', async shardId => {
    let guildCount = 0;
    let userCount = 0;
    try {
      guildCount = await client.shard.broadcastEval(c => c.guilds.cache.size);
      userCount = await client.shard.broadcastEval(c => c.users.cache.size);
    } catch {}

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle(`✅ Shard ${shardId} hazır`)
      .setDescription(`Shard ${shardId} başarıyla Discord'a bağlandı.`)
      .addFields(
        { name: 'Sunucu Sayısı', value: `${guildCount[shardId] ?? 'N/A'}`, inline: true },
        { name: 'Kullanıcı Sayısı', value: `${userCount[shardId] ?? 'N/A'}`, inline: true }
      )
      .setTimestamp();

    sendLog(embed);
  });

  // ❌ Shard hata aldığında
  client.on('shardError', async (error, shardId) => {
    const embed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle(`🔴 Shard ${shardId} hata aldı`)
      .setDescription(`\`\`\`${error.message || error}\`\`\``)
      .setTimestamp();

    sendLog(embed);
  });

  // 🔌 Bot bağlantısı koptuğunda
  client.on('disconnect', async () => {
    const embed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('🔌 Bot Bağlantısı Koptu')
      .setDescription('Discord ile bağlantı kesildi.')
      .setTimestamp();

    sendLog(embed);
  });

  // 🔄 Bot yeniden bağlandığında
  client.on('reconnecting', async () => {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🔄 Bot Yeniden Bağlanıyor')
      .setDescription('Discord ile bağlantı yeniden kuruluyor...')
      .setTimestamp();

    sendLog(embed);
  });
};
