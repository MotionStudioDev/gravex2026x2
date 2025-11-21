const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message, args) => {
  try {
    class Deprem {
      constructor(tarih, saat, enlem, boylam, derinlik, buyukluk, yer, sehir) {
        this.tarih = tarih;
        this.saat = saat;
        this.enlem = enlem;
        this.boylam = boylam;
        this.derinlik = derinlik;
        this.buyukluk = buyukluk;
        this.yer = yer;
        this.sehir = sehir;
      }
    }

    async function getirDepremler() {
      const url = 'http://www.koeri.boun.edu.tr/scripts/lst0.asp';
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const text = $('pre').text();
      let result = text.split('\n');
      result = result.splice(6); // İlk 6 satırı atla

      const depremler = [];
      result.forEach(element => {
        const depremString = element.split(' ').filter(e => e.length > 0);
        if (depremString.length < 10) return;

        const [tarih, saat, enlem, boylam, derinlik, , buyukluk, , yer, sehir] = depremString;
        const deprem = new Deprem(tarih, saat, enlem, boylam, derinlik, buyukluk, yer, sehir);
        depremler.push(deprem);
      });

      return depremler;
    }

    const depremler = await getirDepremler();
    if (depremler.length === 0) return message.channel.send('Deprem verisi bulunamadı.');

    // Sayfalama ayarları
    const perPage = 10;
    let page = 0;

    const generateEmbed = (page) => {
      const slice = depremler.slice(page * perPage, (page + 1) * perPage);
      return new EmbedBuilder()
        .setColor('#ff7300')
        .setTitle(`Son Depremler (Sayfa ${page + 1})`)
        .setTimestamp()
        .setFooter({ text: 'AFAD Deprem Verisi' })
        .setDescription(
          slice.map(d =>
            `**Tarih:** ${d.tarih} ${d.saat}\n` +
            `**Enlem:** ${d.enlem} | **Boylam:** ${d.boylam}\n` +
            `**Derinlik:** ${d.derinlik} km | **Büyüklük:** ${d.buyukluk}\n` +
            `**Yer:** ${d.yer}\n` +
            `**Şehir:** ${d.sehir}`
          ).join('\n\n')
        );
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('⬅️ Geri')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('İleri ➡️')
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({ embeds: [generateEmbed(page)], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 60_000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'Bu butonları sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
      }

      if (interaction.customId === 'prev') {
        page = page > 0 ? page - 1 : page;
      } else if (interaction.customId === 'next') {
        if ((page + 1) * perPage < depremler.length) page++;
      }

      await interaction.update({ embeds: [generateEmbed(page)], components: [row] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });

  } catch (error) {
    console.error('Deprem verisi alınırken bir hata oluştu:', error);
    await message.channel.send('Deprem verilerini alırken bir hata oluştu.');
  }
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: 'deprem',
  description: 'Son depremleri sayfalı şekilde gösterir.'
};
