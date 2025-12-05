const { ShardingManager } = require('discord.js');
const express = require('express'); // 👈 EKLENDİ
const app = express(); // 👈 EKLENDİ
const config = require('./config.js'); 

// ----------------------------------------------------
// 🌐 7/24 AKTİFLİK İÇİN HTTP SUNUCUSU KODU
// ----------------------------------------------------
const port = process.env.PORT || 8080; 

app.get('/', (req, res) => {
    res.status(200).send('Discord Botu Aktif ve Sharder Çalışıyor!');
});

app.listen(port, () => {
    console.log(`[SHARDER] HTTP sunucusu port ${port} üzerinde dinliyor.`);
});
// ----------------------------------------------------

const manager = new ShardingManager('./main.js', {
    token: process.env.TOKEN, 
    // ... diğer ayarlar ...
});

manager.on('shardCreate', shard => {
    console.log(`[SHARD] Parça (Shard) ${shard.id} başlatılıyor...`);
    // ...
});

manager.spawn()
    .then(shards => {
        console.log(`[SHARDER] Toplam ${shards.size} parça başlatıldı.`);
    })
    .catch(error => {
        console.error("[SHARDER HATA] Parça başlatılırken kritik hata oluştu:", error);
    });
