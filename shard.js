const { ShardingManager } = require('discord.js');
const express = require('express');
const app = express();
const config = require('./config.js'); 

// ----------------------------------------------------
// 🌐 7/24 AKTİFLİK İÇİN HTTP SUNUCUSU (SADECE BİR KEZ ÇALIŞIR)
// ----------------------------------------------------
// Render'ın otomatik atadığı portu kullanmak ZORUNLUDUR. (Genellikle 10000)
const port = process.env.PORT || 8080; 

// Render'a botun çalıştığını bildiren basit yanıt
app.get('/', (req, res) => {
    res.status(200).send('Discord Botu Aktif ve Sharder Çalışıyor!');
});

// HTTP Sunucusunu Başlat
app.listen(port, () => {
    console.log(`[SHARDER] HTTP sunucusu port ${port} üzerinde dinliyor. (7/24 Aktiflik)`);
});
// ----------------------------------------------------

// Sharding Yöneticisi Tanımlanıyor
const manager = new ShardingManager('./main.js', {
    token: process.env.TOKEN, // Token Render ortam değişkeninden çekilir
    totalShards: 3,       // Discord'un otomatik olarak parça sayısını belirlemesine izin ver
});

manager.on('shardCreate', shard => {
    console.log(`[SHARD] Parça (Shard) ${shard.id} başlatılıyor...`);

    // Parça hazır olduğunda konsola yazdır
    shard.on('ready', () => {
        console.log(`[SHARD] Parça ${shard.id} Discord'a başarıyla bağlandı (READY).`);
    });
    
    // Parça kapandığında hata durumunu logla
    shard.on('death', (process, signal) => {
        console.error(`[SHARD HATA] Parça ${shard.id} öldü. Kod: ${process.exitCode}, Sinyal: ${signal}`);
    });
});

// Parçaları başlat
manager.spawn()
    .then(shards => {
        console.log(`[SHARDER] Toplam ${shards.size} parça başlatma emri verildi.`);
    })
    .catch(error => {
        console.error("[SHARDER KRİTİK HATA] Sharding Yönetimi başarısız oldu:", error);
    });
