const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const emojis = message.guild.emojis.cache.map(e => ({
    gösterim: `${e} \`${e.name}\``,
    id: `ID: \`${e.id}\``,
    url: e.url
  }));

  if (emojis.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('Emoji Bulunamadı')
      .setDescription('Bu sunucuda hiç özel emoji yok.')
      .setFooter({ text: 'Grave Emoji sistemi' });

    return message.channel.send({ embeds: [embed] });
  }

  const sayfaBoyutu = 1; // her sayfada tek emoji gösterelim
  let sayfa = 0;

  const gösterEmbed = (index) => {
    const sliced = emojis.slice(index * sayfaBoyutu, (index + 1) * sayfaBoyutu);
    const emojiSatırları = sliced.map(e => e.gösterim).join('\n');
    const idSatırları = sliced.map(e => e.id).join('\n');

    return new EmbedBuilder()
      .setColor('Orange')
      .setTitle(`📦 Sunucu Emojileri (Sayfa ${index + 1}/${Math.ceil(emojis.length / sayfaBoyutu)})`)
      .setDescription(`${emojiSatırları}\n\n**ID'ler:**\n${idSatırları}`)
      .setFooter({ text: 'Butonlarla sayfa değiştir.' });
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prev').setLabel('Önceki Emoji').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('download').setLabel('Emojiyi İndir!').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('next').setLabel('Sonraki Emoji').setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({ embeds: [gösterEmbed(sayfa)], components: [row] });

  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    if (i.customId === 'prev' && sayfa > 0) {
      sayfa--;
      await i.update({ embeds: [gösterEmbed(sayfa)], components: [row] });
    }

    if (i.customId === 'next' && (sayfa + 1) * sayfaBoyutu < emojis.length) {
      sayfa++;
      await i.update({ embeds: [gösterEmbed(sayfa)], components: [row] });
    }

    if (i.customId === 'download') {
      const currentEmoji = emojis[sayfa];
      const attachment = new AttachmentBuilder(currentEmoji.url, { name: `${currentEmoji.id}.png` });
      await i.reply({ content: `📥 ${currentEmoji.gösterim} indir!`, files: [attachment], ephemeral: true });
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = {
  aliases: ['emojilist', 'emojiler']
};

module.exports.help = {
  name: 'emojiler'
};
