const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

module.exports.run = async (client, message, args) => {
  
  const fetchShardData = async () => {
    if (client.shard) {
      // Her shard'dan detaylı metrikleri topluyoruz
      return await client.shard.broadcastEval(c => ({
        id: c.shard.ids[0],
        status: c.ws.status,
        ping: Math.round(c.ws.ping),
        guilds: c.guilds.cache.size,
        users: c.guilds.cache.reduce((a, b) => a + b.memberCount, 0),
        memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(2), // MB cinsinden RAM
        uptime: c.uptime
      }));
    } else {
      // Sharding yoksa tekil veriyi döndürür
      return [{
        id: 0,
        status: 0,
        ping: Math.round(client.ws.ping),
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, b) => a + b.memberCount, 0),
        memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        uptime: client.uptime
      }];
    }
  };

  const createShardEmbed = (data) => {
    const toplamSunucu = data.reduce((a, b) => a + b.guilds, 0);
    const toplamKullanici = data.reduce((a, b) => a + b.users, 0);
    
    // Gerçek Yoğun Shard Analizi: Pingi 250ms+ olan veya RAM'i 500MB+ olanları 'Yoğun' sayar
    const yogunShards = data.filter(s => s.ping > 250 || parseFloat(s.memory) > 500).length;
    const onlineShards = data.filter(s => s.status === 0).length;
    const offlineShards = data.length - onlineShards;

    // Ping İstatistikleri
    const sortedByPing = [...data].sort((a, b) => a.ping - b.ping);
    const enDusuk = sortedByPing[0];
    const enYuksek = sortedByPing[sortedByPing.length - 1];
    const ortalamaPing = Math.round(data.reduce((a, b) => a + b.ping, 0) / data.length);

    const uptimeFormat = moment.duration(client.uptime).format("D [Gün], H [Saat], m [Dakika]");

    return new EmbedBuilder()
      .setColor('#2ecc71')
      .setAuthor({ name: `Grave Shard Bilgileri`, iconURL: client.user.displayAvatarURL() })
      .addFields(
        { 
          name: '<:Information:1453765637020319872> Shard Durumları:', 
          value: `• <:onl:1453766738884952286> Çevrimiçi **${onlineShards}** Shard\n• <:off:1453766813291774044> Çevrimdışı **${offlineShards}** Shard\n• <:dnds:1453766771638009907> Yoğun **${yogunShards}** Shard`, 
          inline: false 
        },
        { 
          name: '<:stats:1453769595146997911> Shard İstatistik:', 
          value: `• <:lives:1453770527146643487> Uptime: **${uptimeFormat}**\n• <a:cr:1453771356729512017> En yüksek ping: **${enYuksek.ping}ms** <:down:1453772277446475858> (Shard: **${enYuksek.id}**)\n• <a:pings:1440464530718068846> En düşük ping: **${enDusuk.ping}ms**(Shard: **${enDusuk.id}**)\n• <a:ping:1416529425813737544> Ortalama Ping: **${ortalamaPing}ms**`, 
          inline: false 
        },
        { 
          name: '<:gvenlik:1416529478112383047> Bu Sunucunun Shardı:', 
          value: `• <a:Online1:1453766072359587975> Shard: **${message.guild.shardId || 0}** Ping: **${Math.round(client.ws.ping)}ms**\n• <:gsrv:1453774069450145863> Sunucu Sayısı: **${toplamSunucu.toLocaleString()}**\n• <:userx:1441379546929561650> Kullanıcı Sayısı: **${toplamKullanici.toLocaleString()}**`, 
          inline: false 
        }
      )
      .setFooter({ 
        text: `Toplam Shard: ${data.length} | Toplam Sunucu: ${toplamSunucu.toLocaleString()}`,
        iconURL: client.user.displayAvatarURL() 
      })
      .setTimestamp();
  };

  const initialData = await fetchShardData();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('refresh_shard')
      .setLabel('Menüyü Güncelle')
      .setEmoji('<a:cargando:1453774467988852868>')
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({ 
    embeds: [createShardEmbed(initialData)], 
    components: [row] 
  });

  const collector = msg.createMessageComponentCollector({ 
    componentType: ComponentType.Button, 
    time: 60000 
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: '<:x_:1416529392955555871> Bu butonu sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
    }

    await i.deferUpdate();
    const updatedData = await fetchShardData();
    await msg.edit({ 
      embeds: [createShardEmbed(updatedData)], 
      components: [row] 
    });
  });

  collector.on('end', () => {
    msg.edit({ components: [] }).catch(() => {});
  });
};

module.exports.conf = {
  aliases: ['shards', 'shard-bilgi']
};

module.exports.help = {
  name: 'shard'
};
