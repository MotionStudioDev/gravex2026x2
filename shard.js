const express = require('express');
const app = express();

// ----------------------------------------------------
// 🌐 7/24 UPTIME SUNUCUSU (RENDER İÇİN)
// ----------------------------------------------------
// Bu kısım Render'ın portu dinleyerek botu açık tutmasını sağlar.
const port = process.env.PORT || 10000; 

app.get('/', (req, res) => {
    res.status(200).send('GraveBOT Uptime Sistemi Aktif! 🚀');
});

app.listen(port, () => {
    console.log(`[UPTIME] Port ${port} üzerinden sistem aktif tutuluyor.`);
});

// ----------------------------------------------------
// 🚀 BOTU DİREKT BAŞLAT
// ----------------------------------------------------
// Sharding olmadan direkt main.js dosyanı çalıştırır.
require('./main.js');
