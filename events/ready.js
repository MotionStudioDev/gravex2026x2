const moment = require('moment');
const { ActivityType } = require('discord.js');

const prefix = ayarlar.prefix;

module.exports = (client) => {
  console.log(`${client.user.username} ismi ile giriş yapıldı!`);
  client.user.setStatus('online'); // dnd, idle, invisible, online

  client.user.setActivity(
    `!YENİYIL🔥 !premium🔥 !steam🔥 !webpanel🔥 !yardım🔥 + !gold🔥 + BETA 0.8.4`,
    { type: ActivityType.Watching }
  );

  const toplamKanal = client.channels.cache.size;
  const toplamSunucu = client.guilds.cache.size;
  const toplamKullanıcı = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

  console.log(`${client.user.id}`);
  console.log(`${client.user.username}: Şu an ${toplamKanal} adet kanala, ${toplamSunucu} adet sunucuya ve ${toplamKullanıcı.toLocaleString()} kullanıcıya hizmet veriliyor!`);
};
