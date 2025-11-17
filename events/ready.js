const { ActivityType, EmbedBuilder } = require('discord.js');
const chalk = require('chalk');

module.exports = async (client) => {
  console.log(chalk.green(`[READY] ${client.user.tag} başarıyla giriş yaptı.`));

  client.user.setStatus('online');

  const durumlar = [
    `g!yardım | Grave v1.0.0`,
    `${client.guilds.cache.size} sunucu | ${client.users.cache.size} kullanıcı`,
    `g!premium | g!webpanel | g!gold`,
    `BETA 0.8.4 | Grave`
  ];

  let index = 0;
  setInterval(() => {
    const durum = durumlar[index++ % durumlar.length];
    client.user.setActivity(durum, { type: ActivityType.Watching });
  }, 10000);

  const toplamKanal = client.channels.cache.size;
  const toplamSunucu = client.guilds.cache.size;
  const toplamKullanıcı = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

  console.log(chalk.blue(`[INFO] ${toplamSunucu} sunucu, ${toplamKanal} kanal, ${toplamKullanıcı.toLocaleString()} kullanıcıya hizmet veriliyor.`));
};
