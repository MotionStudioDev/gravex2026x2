const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

module.exports.run = async (client, message, args) => {
  try {
    // Eğer bot shardlara bölünmüşse broadcastEval ile her sharddan veri topluyoruz
    // Eğer shard yoksa (tek process) direkt mevcut veriyi diziye alıyoruz
    let shardVerileri = [];

    if (client.shard) {
      shardVerileri = await client.shard.broadcastEval(c => ({
        id: c.shard.ids[0],
        status: c.ws.status,
        ping: Math.round(c.ws.ping),
        guilds: c.guilds.cache.size,
        users: c.guilds.cache.reduce((a, b) => a + b.memberCount, 0),
        uptime: c.uptime
      }));
    } else {
      // Shard yoksa sadece mevcut botun verisini al
      shardVerileri = [{
        id: 0,
        status: 0,
        ping: Math.round(client.ws.ping),
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, b) => a + b.memberCount, 0),
        uptime: client.uptime
      }];
    }

    const toplamSunucu = shardVerileri.reduce((a, b) => a + b.guilds, 0);
    const toplamKullanici = shardVerileri.reduce((a, b) => a + b.users, 0);
    const ortalamaPing = Math.round(shardVerileri.reduce((a, b) => a + b.ping, 0) / shardVerileri.length);
    
    // En yüksek ve en düşük pingli shardları bul
    const enYuksekPing = shardVerileri.sort((a, b) => b.ping - a.ping)[0];
    const enDusukPing = shardVerileri.sort((a, b) => a.ping - b.ping)[0];
    const uptimeFormat = moment.duration(client.uptime).format("D [Gün], H [Saat], m [Dakika]");

    // Durum sayacı
    const onlineShards = shardVerileri.filter(s => s.status === 0).length;
    const offlineShards = shardVerileri.length - onlineShards;

    const shardEmbed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setAuthor({ name: `${client.user.username} Gerçek Shard Bilgileri`, iconURL: client.user.displayAvatarURL() })
      .addFields(
        { 
          name: 'ℹ️ Shard Durumları:', 
          value: `• 🟢 Çevrimiçi **${onlineShards}** Shard\n• ⚪ Çevrimdışı **${offlineShards}** Shard\n• 🔴 Yoğun **0** Shard`, 
          inline: false 
        },
        { 
          name: '📊 Shard İstatistik:', 
          inline: false,
          value: `• ✅ Uptime: **${uptimeFormat}**\n• 🆙 En yüksek ping: **${enYuksekPing.ping}ms** 🔴 (Shard: **${enYuksekPing.id}**)\n• ✅ En düşük ping: **${enDusukPing.ping}ms** 🟢 (Shard: **${enDusukPing.id}**)\n• 📡 Ortalama Ping: **${ortalamaPing}ms**`
        },
        { 
          name: '🛡️ Bu Sunucunun Verileri:', 
          value: `• 🟢 Shard: **${message.guild.shardId || 0}** Ping: **${Math.round(client.ws.ping)}ms** 🟢\n• 🏠 Toplam Sunucu: **${toplamSunucu.toLocaleString()}**\n• 👤 Toplam Kullanıcı: **${toplamKullanici.toLocaleString()}**`, 
          inline: false 
        }
      )
      .setFooter({ text: `Güncel Shard Sayısı: ${shardVerileri.length}` })
      .setTimestamp();

    message.channel.send({ embeds: [shardEmbed] });

  } catch (err) {
    console.error(err);
    message.reply("❌ Shard verileri toplanırken bir hata oluştu. Shard Manager aktif olmayabilir.");
  }
};

module.exports.conf = {
  aliases: ['shards']
};

module.exports.help = {
  name: 'shard'
};
