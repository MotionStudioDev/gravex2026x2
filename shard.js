const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  const logKanalId = '1441487124686700746'; // sabit log kanalı

  client.on('shardCreate', shard => {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`🟢 Shard ${shard.id} oluşturuldu`)
      .setDescription(`Shard ${shard.id} başarıyla başlatıldı.`)
      .setTimestamp();

    const kanal = client.channels.cache.get(logKanalId);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  client.on('shardError', (error, shardId) => {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle(`🔴 Shard ${shardId} hata aldı`)
      .setDescription(`\`\`\`${error.message || error}\`\`\``)
      .setTimestamp();

    const kanal = client.channels.cache.get(logKanalId);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  client.on('shardReady', shardId => {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`✅ Shard ${shardId} hazır`)
      .setDescription(`Shard ${shardId} başarıyla Discord'a bağlandı.`)
      .setTimestamp();

    const kanal = client.channels.cache.get(logKanalId);
    if (kanal) kanal.send({ embeds: [embed] });
  });
};
