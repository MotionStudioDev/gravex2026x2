const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  const logKanalId = '1441487124686700746'; // Log kanalının ID'si

  // ✅ Bot açıldığında
  client.on('ready', async () => {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('✅ Bot Açıldı')
      .setDescription(`Bot ${client.user.tag} başarıyla giriş yaptı.`)
      .setTimestamp();

    const kanal = await client.channels.fetch(logKanalId).catch(() => null);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  // ✅ Shard oluşturulduğunda
  client.on('shardCreate', async shard => {
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle(`🟢 Shard ${shard.id} oluşturuldu`)
      .setDescription(`Shard ${shard.id} başarıyla başlatıldı.`)
      .setTimestamp();

    const kanal = await client.channels.fetch(logKanalId).catch(() => null);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  // ✅ Shard hazır olduğunda
  client.on('shardReady', async shardId => {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`✅ Shard ${shardId} hazır`)
      .setDescription(`Shard ${shardId} başarıyla Discord'a bağlandı.`)
      .setTimestamp();

    const kanal = await client.channels.fetch(logKanalId).catch(() => null);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  // ✅ Shard hata aldığında
  client.on('shardError', async (error, shardId) => {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle(`🔴 Shard ${shardId} hata aldı`)
      .setDescription(`\`\`\`${error.message || error}\`\`\``)
      .setTimestamp();

    const kanal = await client.channels.fetch(logKanalId).catch(() => null);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  // ✅ Bot bağlantısı koptuğunda
  client.on('disconnect', async () => {
    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('🔌 Bot Bağlantısı Koptu')
      .setDescription('Discord ile bağlantı kesildi.')
      .setTimestamp();

    const kanal = await client.channels.fetch(logKanalId).catch(() => null);
    if (kanal) kanal.send({ embeds: [embed] });
  });

  // ✅ Bot yeniden bağlandığında
  client.on('reconnecting', async () => {
    const embed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('🔄 Bot Yeniden Bağlanıyor')
      .setDescription('Discord ile bağlantı yeniden kuruluyor...')
      .setTimestamp();

    const kanal = await client.channels.fetch(logKanalId).catch(() => null);
    if (kanal) kanal.send({ embeds: [embed] });
  });
};
