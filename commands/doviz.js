const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

async function getRate(symbol) {
  try {
    const res = await axios.get(`https://api.exchangerate.host/latest?base=${symbol}&symbols=TRY`);
    return res.data.rates.TRY;
  } catch {
    return null;
  }
}

async function getHistory(symbol) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const res = await axios.get(
    `https://api.exchangerate.host/timeseries?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}&base=${symbol}&symbols=TRY`
  );
  return res.data.rates;
}

async function buildChart(history) {
  const labels = Object.keys(history);
  const data = Object.values(history).map(r => r.TRY);

  const chart = new ChartJSNodeCanvas({ width: 600, height: 400 });
  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Kur (TRY)',
        data,
        borderColor: 'rgba(75,192,192,1)',
        fill: false
      }]
    }
  };
  const buffer = await chart.renderToBuffer(config);
  return new AttachmentBuilder(buffer, { name: 'kur.png' });
}

async function buildEmbed(idx, amount = null) {
  const symbol = currencies[idx];
  const rate = await getRate(symbol);
  let desc = `**${symbol} → TRY**\n\n📊 Güncel Kur: **${rate ? rate.toFixed(2) : 'Veri yok'}**\n🔖 Sembol: ${symbol}`;

  if (amount && rate) {
    const converted = (amount * rate).toFixed(2);
    desc += `\n\n💰 ${amount} ${symbol} ≈ **${converted} TRY**`;
  }

  return new EmbedBuilder()
    .setColor('Blue')
    .setTitle(`💱 Döviz Kuru (${idx + 1}/${currencies.length})`)
    .setDescription(desc)
    .setFooter({ text: 'Butonlarla gezinebilirsin.' });
}

module.exports.run = async (client, message, args) => {
  let index = 0;
  let amount = null;

  // Kullanıcı miktar + sembol girdiyse
  if (args.length === 2) {
    amount = parseFloat(args[0]);
    const symbol = args[1].toUpperCase();
    if (!isNaN(amount) && currencies.includes(symbol)) {
      index = currencies.indexOf(symbol);
    }
  }

  const row = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Önceki Kur').setStyle(ButtonStyle.Primary).setDisabled(index === 0),
    new ButtonBuilder().setCustomId('detail').setLabel('📥 Kur Detayı').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('graph').setLabel('📈 Grafik').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('next').setLabel('Sonraki Kur ➡️').setStyle(ButtonStyle.Primary).setDisabled(index === currencies.length - 1)
  );

  const msg = await message.channel.send({ embeds: [await buildEmbed(index, amount)], components: [row()] });

  const collector = msg.createMessageComponentCollector({ time: 120000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    if (i.customId === 'prev' && index > 0) {
      index--;
      await i.update({ embeds: [await buildEmbed(index, amount)], components: [row()] });
    }

    if (i.customId === 'next' && index < currencies.length - 1) {
      index++;
      await i.update({ embeds: [await buildEmbed(index, amount)], components: [row()] });
    }

    if (i.customId === 'detail') {
      const symbol = currencies[index];
      const rate = await getRate(symbol);
      const detailEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle(`📥 Kur Detayı: ${symbol}`)
        .setDescription(`**${symbol} → TRY**\n\n📊 Güncel Kur: **${rate ? rate.toFixed(4) : 'Veri yok'}**\n\n🕒 Tarih: ${new Date().toLocaleString('tr-TR')}`)
        .setFooter({ text: 'Döviz sistemi' });

      await i.reply({ embeds: [detailEmbed], ephemeral: true });
    }

    if (i.customId === 'graph') {
      const symbol = currencies[index];
      const history = await getHistory(symbol);
      const chartFile = await buildChart(history);

      const graphEmbed = new EmbedBuilder()
        .setColor('Purple')
        .setTitle(`📈 ${symbol}/TRY Son 7 Gün`)
        .setDescription('Son 7 günün kur değişim grafiği aşağıda:')
        .setFooter({ text: 'Döviz sistemi' });

      await i.reply({ embeds: [graphEmbed], files: [chartFile], ephemeral: true });
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = {
  aliases: ['doviz', 'kur']
};

module.exports.help = {
  name: 'döviz',
  description: 'Butonlu, profesyonel döviz kuru sistemi. Miktar girilirse TL karşılığını hesaplar ve grafik gösterir.'
};
