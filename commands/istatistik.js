const { EmbedBuilder } = require('discord.js');
const os = require('os');
const moment = require('moment');
require('moment-duration-format');

module.exports.run = async (client, message, args) => {
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('📊 Lütfen bekleyin, istatistikler analiz ediliyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

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

  const statsEmbed = new EmbedBuilder()
    .setColor('Green')
    .setTitle('📈 Grave İstatistikleri')
    .addFields(
      { name: 'Mesaj Gecikmesi', value: `${latency}ms`, inline: true },
      { name: 'Bot Ping (API)', value: `${apiPing}ms`, inline: true },
      { name: 'Uptime', value: uptime, inline: false },
      { name: 'RAM Kullanımı', value: `${memoryUsage} MB / ${totalMem} GB`, inline: false },
      { name: 'CPU', value: `${cpuModel} (${cpuCores} çekirdek)`, inline: false },
      { name: 'Node.js Sürümü', value: nodeVersion, inline: true },
      { name: 'discord.js Sürümü', value: `v${discordJsVersion}`, inline: true },
      { name: 'Bot Oluşturulma Tarihi', value: botCreatedAt, inline: false },
      { name: 'Sunucu Sayısı', value: `${client.guilds.cache.size}`, inline: true },
      { name: 'Kullanıcı Sayısı', value: `${client.users.cache.size}`, inline: true },
      { name: 'Toplam Komut', value: `${commandCount}`, inline: true }
    )
    .setFooter({ text: 'Veriler analiz edildi.' });

  await msg.edit({ embeds: [statsEmbed] });
};

module.exports.conf = {
  aliases: ['botbilgi', 'bilgi']
};

module.exports.help = {
  name: 'istatistik'
};
