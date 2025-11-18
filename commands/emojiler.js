const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const emojis = message.guild.emojis.cache.map(e => ({
    gösterim: `${e} \`${e.name}\``,
    id: `ID: \`${e.id}\``
  }));

  if (emojis.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('🚫 Emoji Bulunamadı')
      .setDescription('Bu sunucuda hiç özel emoji yok.')
      .setFooter({ text: 'Emoji sistemi' });

    return message.channel.send({ embeds: [embed] });
  }

  const sayfaBoyutu = 10;
  let sayfa = 0;

  const gösterEmbed = (index) => {
    const sliced = emojis.slice(index * sayfaBoyutu, (index + 1) * sayfaBoyutu);
    const emojiSatırları = sliced.map(e => e.gösterim).join('\n');
    const idSatırları = sliced.map(e => e.id).join('\n');

    return new EmbedBuilder()
      .setColor('Orange')
      .setTitle(`📦 Sunucu Emojileri (Sayfa ${index + 1}/${Math.ceil(emojis.length / sayfaBoyutu)})`)
      .setDescription(`${emojiSatırları}\n\n**<:ID:1416530654006349967> ID'ler:**\n${idSatırları}`)
      .setFooter({ text: '⬅️ / ➡️ ile sayfa değiştir.' });
  };

  const msg = await message.channel.send({ embeds: [gösterEmbed(sayfa)] });
  await msg.react('⬅️');
  await msg.react('➡️');

  const filter = (reaction, user) =>
    ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id;

  const collector = msg.createReactionCollector({ filter, time: 60000 });

  collector.on('collect', async (reaction, user) => {
    await reaction.users.remove(user.id);

    if (reaction.emoji.name === '⬅️' && sayfa > 0) sayfa--;
    else if (reaction.emoji.name === '➡️' && (sayfa + 1) * sayfaBoyutu < emojis.length) sayfa++;

    await msg.edit({ embeds: [gösterEmbed(sayfa)] });
  });
};

module.exports.conf = {
  aliases: ['emojilist', 'emojiler']
};

module.exports.help = {
  name: 'emojiler'
};
