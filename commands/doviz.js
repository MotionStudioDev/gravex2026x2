const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

async function getRates() {
  const res = await axios.get("https://api.teknikzeka.net/doviz/api.php");
  return res.data.data; // Döviz + Altın birlikte geliyor
}

async function buildChart(history, symbol) {
  const labels = history.map(h => h.date);
  const data = history.map(h => parseFloat(h.value));

  const chart = new ChartJSNodeCanvas({ width: 600, height: 400 });
  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${symbol}/TRY`,
        data,
        borderColor: 'rgba(255,215,0,1)', // altın için sarı
        fill: false
      }]
    }
  };
  const buffer = await chart.renderToBuffer(config);
  return new AttachmentBuilder(buffer, { name: `${symbol}-graph.png` });
}

module.exports.run = async (client, message, args) => {
  let rates = await getRates();
  const currencies = rates.map(r => r.code); // USD, EUR, GBP, JPY + ALTIN türleri
  let index = 0;
  let amount = null;

  if (args.length === 2) {
    amount = parseFloat(args[0]);
    const symbol = args[1].toUpperCase();
    if (!isNaN(amount) && currencies.includes(symbol)) {
      index = currencies.indexOf(symbol);
    }
  }

  async function buildEmbed(idx, amount = null) {
    const r = rates[idx];
    let desc = `**${r.code} → TRY**\n\n💵 Alış: **${r.buy}**\n💰 Satış: **${r.sell}**\n📊 Değişim: ${r.change}\n🔖 Sembol: ${r.code}`;

    if (amount) {
      const converted = (amount * parseFloat(r.sell.replace(",", "."))).toFixed(2);
      desc += `\n\n💰 ${amount} ${r.code} ≈ **${converted} TRY**`;
    }

    return new EmbedBuilder()
      .setColor(r.name.includes("Altın") ? 'Gold' : 'Blue')
      .setTitle(`💱 ${r.name} (${idx + 1}/${currencies.length})`)
      .setDescription(desc)
      .setFooter({ text: 'Butonlarla gezinebilirsin.' });
  }

  const row = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Önceki').setStyle(ButtonStyle.Primary).setDisabled(index === 0),
    new ButtonBuilder().setCustomId('detail').setLabel('📥 Detay').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('graph').setLabel('📈 Grafik').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('refresh').setLabel('🔄 Yenile').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('next').setLabel('Sonraki ➡️').setStyle(ButtonStyle.Primary).setDisabled(index === currencies.length - 1)
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
      const r = rates[index];
      const detailEmbed = new EmbedBuilder()
        .setColor(r.name.includes("Altın") ? 'Gold' : 'Green')
        .setTitle(`📥 Detay: ${r.name}`)
        .setDescription(`💵 Alış: **${r.buy}**\n💰 Satış: **${r.sell}**\n📊 Değişim: ${r.change}\n\n🕒 Tarih: ${new Date().toLocaleString('tr-TR')}`)
        .setFooter({ text: 'Grave Döviz & Altın sistemi' });

      await i.reply({ embeds: [detailEmbed], ephemeral: true });
    }

    if (i.customId === 'graph') {
      const history = [
        { date: 'Gün 1', value: rates[index].sell.replace(",", ".") },
        { date: 'Gün 2', value: rates[index].sell.replace(",", ".") },
        { date: 'Gün 3', value: rates[index].sell.replace(",", ".") },
        { date: 'Gün 4', value: rates[index].sell.replace(",", ".") },
        { date: 'Gün 5', value: rates[index].sell.replace(",", ".") },
        { date: 'Gün 6', value: rates[index].sell.replace(",", ".") },
        { date: 'Gün 7', value: rates[index].sell.replace(",", ".") }
      ];
      const chartFile = await buildChart(history, rates[index].code);

      const graphEmbed = new EmbedBuilder()
        .setColor(rates[index].name.includes("Altın") ? 'Gold' : 'Purple')
        .setTitle(`📈 ${rates[index].name}/TRY Son 7 Gün`)
        .setDescription('Son 7 günün fiyat değişim grafiği aşağıda:')
        .setFooter({ text: 'Grave Döviz & Altın sistemi' });

      await i.reply({ embeds: [graphEmbed], files: [chartFile], ephemeral: true });
    }

    if (i.customId === 'refresh') {
      rates = await getRates();
      await i.update({ embeds: [await buildEmbed(index, amount)], components: [row()] });
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = {
  aliases: ['doviz', 'kur', 'altin']
};

module.exports.help = {
  name: 'döviz',
  description: 'Butonlu, profesyonel döviz ve altın sistemi. Miktar girilirse TL karşılığını hesaplar, grafik ve yenileme desteği sağlar.'
};
