const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const emojis = message.guild.emojis.cache.map(e => ({
    gösterim: `${e} \`${e.name}\``,
    id: `ID: \`${e.id}\``,
    url: e.url, // otomatik olarak png/gif linki
    name: e.name
  }));

  if (emojis.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('Emoji Bulunamadı')
      .setDescription('Bu sunucuda hiç özel emoji yok.')
      .setFooter({ text: 'Emoji sistemi' });

    return message.channel.send({ embeds: [embed] });
  }

  let sayfa = 0;

  const gösterEmbed = (index) => {
    const emoji = emojis[index];
    return new EmbedBuilder()
      .setColor('Orange')
      .setTitle(`📦 Sunucu Emojisi (${index + 1}/${emojis.length})`)
      .setDescription(`${emoji.gösterim}\n${emoji.id}`)
      .setImage(emoji.url) // büyük görsel
      .setFooter({ text: 'Butonlarla gezinebilirsin.' });
  };

  const row = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Önceki Emoji').setStyle(ButtonStyle.Primary).setDisabled(sayfa === 0),
    new ButtonBuilder().setCustomId('download').setLabel('📥 Emojiyi İndir!').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('next').setLabel('Sonraki Emoji ➡️').setStyle(ButtonStyle.Primary).setDisabled(sayfa === emojis.length - 1)
  );

  const msg = await message.channel.send({ embeds: [gösterEmbed(sayfa)], components: [row()] });

  const collector = msg.createMessageComponentCollector({ time: 120000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    if (i.customId === 'prev' && sayfa > 0) {
      sayfa--;
      await i.update({ embeds: [gösterEmbed(sayfa)], components: [row()] });
    }

    if (i.customId === 'next' && sayfa < emojis.length - 1) {
      sayfa++;
      await i.update({ embeds: [gösterEmbed(sayfa)], components: [row()] });
    }

    if (i.customId === 'download') {
      const currentEmoji = emojis[sayfa];
      // dosya uzantısını gif/png olarak ayarla
      const ext = currentEmoji.url.endsWith('.gif') ? 'gif' : 'png';
      const attachment = new AttachmentBuilder(currentEmoji.url, { name: `${currentEmoji.name}.${ext}` });
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
  name: 'emojiler',
  description: 'Sunucudaki özel emojileri büyük görsel ve indirme desteğiyle listeler.'
};
