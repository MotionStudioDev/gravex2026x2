const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

// Örnek dil listesi
const languages = [
  { code: 'en', name: 'İngilizce' },
  { code: 'de', name: 'Almanca' },
  { code: 'fr', name: 'Fransızca' },
  { code: 'es', name: 'İspanyolca' },
  { code: 'ru', name: 'Rusça' }
];

async function translate(text, target) {
  // LibreTranslate API örneği
  const res = await axios.post("https://libretranslate.de/translate", {
    q: text,
    source: "auto",
    target: target,
    format: "text"
  }, { headers: { "Content-Type": "application/json" } });
  return res.data.translatedText;
}

module.exports.run = async (client, message, args) => {
  if (args.length < 2) {
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('Red')
        .setTitle('🚫 Hata')
        .setDescription('Doğru kullanım: `g!çevir <dil> <metin>`\nÖrn: `g!çevir en Merhaba dünya`')]
    });
  }

  let langCode = args[0].toLowerCase();
  let text = args.slice(1).join(" ");
  let index = languages.findIndex(l => l.code === langCode);
  if (index === -1) index = 0;

  async function buildEmbed(idx) {
    const lang = languages[idx];
    const translated = await translate(text, lang.code);

    return new EmbedBuilder()
      .setColor('Blue')
      .setTitle(`🌐 Çeviri Sistemi (${idx + 1}/${languages.length})`)
      .setDescription(`📝 Orijinal: **${text}**\n\n🎯 Dil: ${lang.name} (${lang.code})\n\n📖 Çeviri: **${translated}**`)
      .setFooter({ text: 'Butonlarla dil değiştirebilirsin.' });
  }

  const row = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Önceki Dil').setStyle(ButtonStyle.Primary).setDisabled(index === 0),
    new ButtonBuilder().setCustomId('detail').setLabel('📥 Detay').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('refresh').setLabel('🔄 Yeniden Çevir').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('next').setLabel('Sonraki Dil ➡️').setStyle(ButtonStyle.Primary).setDisabled(index === languages.length - 1)
  );

  const msg = await message.channel.send({ embeds: [await buildEmbed(index)], components: [row()] });

  const collector = msg.createMessageComponentCollector({ time: 120000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    if (i.customId === 'prev' && index > 0) {
      index--;
      await i.update({ embeds: [await buildEmbed(index)], components: [row()] });
    }

    if (i.customId === 'next' && index < languages.length - 1) {
      index++;
      await i.update({ embeds: [await buildEmbed(index)], components: [row()] });
    }

    if (i.customId === 'detail') {
      const lang = languages[index];
      const detailEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle(`📥 Çeviri Detayı`)
        .setDescription(`Dil: ${lang.name} (${lang.code})\n🕒 Tarih: ${new Date().toLocaleString('tr-TR')}`)
        .setFooter({ text: 'Çeviri sistemi' });

      await i.reply({ embeds: [detailEmbed], ephemeral: true });
    }

    if (i.customId === 'refresh') {
      await i.update({ embeds: [await buildEmbed(index)], components: [row()] });
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = {
  aliases: ['çevir', 'translate']
};

module.exports.help = {
  name: 'çeviri',
  description: 'Butonlu, profesyonel çeviri sistemi. Metni farklı dillere çevirir.'
};
