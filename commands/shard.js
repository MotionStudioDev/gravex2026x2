const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

module.exports.run = async (client, message, args) => {
  // Verileri toplayan ana fonksiyon
  const fetchShardData = async () => {
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
      shardVerileri = [{
        id: 0,
        status: 0,
        ping: Math.round(client.ws.ping),
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, b) => a + b.memberCount, 0),
        uptime: client.uptime
      }];
    }
    return shardVerileri;
  };

  // Embed oluşturma fonksiyonu
  const createShardEmbed = (data) => {
    const toplamSunucu = data.reduce((a, b) => a + b.guilds, 0);
    const toplamKullanici = data.reduce((a, b) => a + b.users, 0);
    const ortalamaPing = Math.round(data.reduce((a, b) => a + b.ping, 0) / data.length);
    const enYuksekPing = data.sort((a, b) => b.ping - a.ping)[0];
    const enDusukPing = data.sort((a, b) => a.ping - b.ping)[0];
    const uptimeFormat = moment.duration(client.uptime).format("H [Saat], m [Dakika], s [Saniye]");
    const onlineShards = data.filter(s => s.status === 0).length;

    return new EmbedBuilder()
      .setColor('#2ecc71')
      .setAuthor({ name: `Grave Shard Bilgileri`, iconURL: client.user.displayAvatarURL() })
      .addFields(
        { 
          name: '<:Information:1453765637020319872> Shard Durumları:', 
          value: `• <:onl:1453766738884952286> Çevrimiçi **${onlineShards}** Shard\n• <:off:1453766813291774044> Çevrimdışı **${data.length - onlineShards}** Shard\n• <:dnds:1453766771638009907> Yoğun **0** Shard`, 
          inline: false 
        },
        { 
          name: '📊 Shard İstatistik:', 
          value: `• ✅ Uptime: **${uptimeFormat}**\n• 🆙 En yüksek ping: **${enYuksekPing.ping}ms** 🔴 (Shard: **${enYuksekPing.id}**)\n• ✅ En düşük ping: **${enDusukPing.ping}ms** 🟢 (Shard: **${enDusukPing.id}**)\n• 📡 Ortalama Ping: **${ortalamaPing}ms**`, 
          inline: false 
        },
        { 
          name: '🛡️ Bu Sunucunun Shardı:', 
          value: `• 🟢 Shard: **${message.guild.shardId || 0}** Ping: **${Math.round(client.ws.ping)}ms** 🟢\n• 🏠 Sunucu Sayısı: **${toplamSunucu.toLocaleString()}**\n• 👤 Kullanıcı Sayısı: **${toplamKullanici.toLocaleString()}**`, 
          inline: false 
        }
      )
      .setFooter({ 
        text: `Shard Sayısı: ${data.length} | Sunucu: ${toplamSunucu.toLocaleString()} | Kullanıcı: ${toplamKullanici.toLocaleString()}`,
        iconURL: client.user.displayAvatarURL() 
      })
      .setTimestamp();
  };

  const initialData = await fetchShardData();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('refresh_shard')
      .setLabel('Menüyü Güncelle')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({ 
    embeds: [createShardEmbed(initialData)], 
    components: [row] 
  });

  // Buton Collector
  const collector = msg.createMessageComponentCollector({ 
    componentType: ComponentType.Button, 
    time: 60000 
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: '❌ Bu butonu sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
    }

    await i.deferUpdate(); // Butonun "düşünmesini" sağlar
    
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
