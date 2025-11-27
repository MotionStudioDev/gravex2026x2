const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const os = require('os');
const moment = require('moment');
require('moment-duration-format');

let commandUsageCount = 0; // global counter
let messageCount = 0; // mesaj işleme sayacı
const startTime = Date.now();

module.exports.run = async (client, message) => {
  commandUsageCount++; // her çalıştırmada artır

  const generateEmbed = async () => {
    const uptime = moment.duration(client.uptime).format('D [gün], H [saat], m [dakika], s [saniye]');
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const cpuModel = os.cpus()[0].model;
    const cpuCores = os.cpus().length;
    const apiPing = Math.round(client.ws.ping);
    const latency = Date.now() - message.createdTimestamp;
    const nodeVersion = process.version;
    const discordJsVersion = require('discord.js').version;
    const botCreatedAt = `<t:${Math.floor(client.user.createdTimestamp / 1000)}:F>`;
    const commandCount = client.commands.size;

    const shardId = client.shard?.ids?.[0] ?? 'Yok';
    const totalShards = client.shard?.count ?? 'Yok';

    // CPU load average (1, 5, 15 dakika)
    const cpuLoad = os.loadavg().map(v => v.toFixed(2)).join(' / ');

    // Process uptime
    const processUptime = moment.duration(process.uptime() * 1000).format('D [gün], H [saat], m [dakika], s [saniye]');

    // Shard latency (her shard için ping)
    let shardLatencies = 'Yok';
    let shardGuilds = 'Yok';
    let shardUsers = 'Yok';
    if (client.shard) {
      try {
        const pingResults = await client.shard.broadcastEval(c => c.ws.ping);
        shardLatencies = pingResults.map((ping, i) => `Shard ${i}: ${Math.round(ping)}ms`).join('\n');

        const guildResults = await client.shard.broadcastEval(c => c.guilds.cache.size);
        shardGuilds = guildResults.map((g, i) => `Shard ${i}: ${g} sunucu`).join('\n');

        const userResults = await client.shard.broadcastEval(c => c.users.cache.size);
        shardUsers = userResults.map((u, i) => `Shard ${i}: ${u} kullanıcı`).join('\n');
      } catch {
        shardLatencies = 'Shard bilgisi alınamadı.';
      }
    }

    // Process ID + Parent PID
    const processId = process.pid;
    const parentPid = process.ppid;

    // Process start time
    const processStart = `<t:${Math.floor(startTime / 1000)}:F>`;

    // Platform + Arch
    const platform = os.platform();
    const arch = os.arch();

    // Mesaj işleme hızı (msg/saniye)
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const msgPerSec = (messageCount / elapsedSeconds).toFixed(2);

    return new EmbedBuilder()
      .setColor('Green')
      .setTitle('📈 Grave İstatistikleri')
      .addFields(
        { name: 'Mesaj Gecikmesi', value: `${latency}ms`, inline: true },
        { name: 'Bot Ping (API)', value: `${apiPing}ms`, inline: true },
        { name: 'Uptime', value: uptime, inline: false },
        { name: 'Process Uptime', value: processUptime, inline: false },
        { name: 'RAM Kullanımı', value: `${memoryUsage} MB / ${totalMem} GB`, inline: false },
        { name: 'CPU', value: `${cpuModel} (${cpuCores} çekirdek)`, inline: false },
        { name: 'CPU Load Avg', value: cpuLoad, inline: false },
        { name: 'Node.js Sürümü', value: nodeVersion, inline: true },
        { name: 'discord.js Sürümü', value: `v${discordJsVersion}`, inline: true },
        { name: 'Bot Oluşturulma Tarihi', value: botCreatedAt, inline: false },
        { name: 'Sunucu Sayısı', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Kullanıcı Sayısı', value: `${client.users.cache.size}`, inline: true },
        { name: 'Toplam Komut', value: `${commandCount}`, inline: true },
        { name: 'Komut Kullanım Sayısı', value: `${commandUsageCount}`, inline: true },
        { name: 'Shard ID', value: `${shardId}`, inline: true },
        { name: 'Toplam Shard', value: `${totalShards}`, inline: true },
        { name: 'Shard Latency', value: shardLatencies, inline: false },
        { name: 'Shard Sunucu Sayısı', value: shardGuilds, inline: false },
        { name: 'Shard Kullanıcı Sayısı', value: shardUsers, inline: false },
        { name: 'Mesaj İşleme Hızı', value: `${msgPerSec} msg/s`, inline: false },
        { name: 'Process ID', value: `${processId}`, inline: true },
        { name: 'Parent PID', value: `${parentPid}`, inline: true },
        { name: 'Process Start Time', value: processStart, inline: false },
        { name: 'Platform', value: platform, inline: true },
        { name: 'Mimari', value: arch, inline: true }
      )
      .setFooter({ text: 'Veriler analiz edildi.' });
  };

  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('📊 Lütfen bekleyin, istatistikler analiz ediliyor...');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('yenile')
      .setLabel('🔄 Verileri Yenile')
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  await msg.edit({ embeds: [await generateEmbed()], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.customId === 'yenile') {
      await i.update({ embeds: [await generateEmbed()], components: [row] });
    }
  });

  collector.on('end', async () => {
    try {
      const disabledRow = new ActionRowBuilder().addComponents(
        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );
      await msg.edit({ components: [disabledRow] });
    } catch {}
  });
};

// Mesaj işleme sayacı için event listener
module.exports.messageCounter = (client) => {
  client.on('messageCreate', () => {
    messageCount++;
  });
};

module.exports.conf = {
  aliases: ['botbilgi', 'bilgi']
};

module.exports.help = {
  name: 'istatistik'
};
