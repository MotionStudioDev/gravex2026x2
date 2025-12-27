const { ShardingManager } = require('discord.js');
const express = require('express');
const app = express();

// ----------------------------------------------------
// 🌐 7/24 AKTİFLİK İÇİN HTTP SUNUCUSU
// ----------------------------------------------------
// Render'ın uyku moduna geçmemesi için gerekli port ayarı
const port = process.env.PORT || 8080; 

app.get('/', (req, res) => {
    res.status(200).send('GraveBOT Sharder Aktif! 7/24 Sistemi Çalışıyor.');
});

app.listen(port, () => {
    console.log(`[SHARDER] HTTP sunucusu port ${port} üzerinde dinliyor.`);
});

// ----------------------------------------------------
// 🛡️ SHARDING YÖNETİCİSİ (3 PARÇA AYARLI)
// ----------------------------------------------------
const manager = new ShardingManager('./main.js', {
    token: process.env.TOKEN, // Token Render ortam değişkenlerinden çekilir
    totalShards: 3,           // İstediğin gibi 3 parça olarak sabitlendi
    respawn: true,            // Bir parça çökerse otomatik olarak yeniden başlatır
    shardArgs: ['--ansi', '--color'], 
});

manager.on('shardCreate', shard => {
    console.log(`[SHARD] Parça ${shard.id} oluşturuldu ve başlatılıyor...`);

    // Parça tamamen hazır olduğunda
    shard.on('ready', () => {
        console.log(`[SHARD] Parça ${shard.id} başarıyla Discord'a bağlandı.`);
    });
    
    // Parça beklenmedik bir şekilde kapandığında
    shard.on('death', (process, signal) => {
        console.error(`[SHARD HATA] Parça ${shard.id} kapandı! Yeniden başlatılıyor...`);
    });
});

// ----------------------------------------------------
// 🚀 PARÇALARI GÜVENLİ ŞEKİLDE BAŞLAT
// ----------------------------------------------------
// delay: 5000 -> Render'ın işlemcisini yormamak için her parça arası 5 saniye bekler.
// timeout: -1 -> Yavaş yükleme durumlarında zaman aşımı hatası almanı engeller.
manager.spawn({ delay: 5000, timeout: -1 })
    .then(shards => {
        console.log(`[SHARDER] Toplam ${shards.size} parça başarıyla sıraya alındı ve başlatıldı.`);
    })
    .catch(error => {
        console.error("[SHARDER KRİTİK HATA] Başlatma sırasında bir sorun oluştu:", error);
    });
