const { ShardingManager } = require('discord.js');
const path = require('path');

const manager = new ShardingManager(path.join(__dirname, 'main.js'), {
  totalShards: 2, // 🔥 Burada shard sayısını belirliyorsun (2 shard açacak)
  token: process.env.TOKEN // Tokeni buradan alıyor
});

manager.on('shardCreate', shard => {
  console.log(`✅ Shard ${shard.id} başlatıldı`);
});

manager.spawn();
