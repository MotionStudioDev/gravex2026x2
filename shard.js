const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  const logKanalId = '1441487124686700746'; // Log kanalının ID'si

  // Bot açıldığında
  client.on('ready', () => {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('✅ Bot Açıldı')
      .setDescription(`Bot ${client.user.tag} başarıyla giriş yaptı.`)
      .setTimestamp();

    const kanal = client.channels.cache.get(logKanalId);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  // Shard oluşturulduğunda
  client.on('shardCreate', shard => {
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle(`🟢 Shard ${shard.id} oluşturuldu`)
      .setDescription(`Shard ${shard.id} başarıyla başlatıldı.`)
      .setTimestamp();

    const kanal = client.channels.cache.get(logKanalId);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  // Shard hazır olduğunda
  client.on('shardReady', shardId => {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`✅ Shard ${shardId} hazır`)
      .setDescription(`Shard ${shardId} başarıyla Discord'a bağlandı.`)
      .setTimestamp();

    const kanal = client.channels.cache.get(logKanalId);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  // Shard hata aldığında
  client.on('shardError', (error, shardId) => {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle(`🔴 Shard ${shardId} hata aldı`)
      .setDescription(`\`\`\`${error.message || error}\`\`\``)
      .setTimestamp();

    const kanal = client.channels.cache.get(logKanalId);
    if (kanal) kanal.send({ embeds: [embed] });
  });
};
