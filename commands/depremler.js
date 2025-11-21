const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder } = require('discord.js');

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

    if (depremler.length > 0) {
      const enSon5Deprem = depremler.slice(0, 5);

      const embed = new EmbedBuilder()
        .setColor('#ff7300')
        .setTitle('Son 5 Deprem')
        .setTimestamp()
        .setFooter({ text: 'AFAD Deprem Verisi' })
        .setDescription(
          enSon5Deprem.map(deprem =>
            `**Tarih:** ${deprem.tarih} ${deprem.saat}\n` +
            `**Enlem:** ${deprem.enlem} | **Boylam:** ${deprem.boylam}\n` +
            `**Derinlik:** ${deprem.derinlik} km | **Büyüklük:** ${deprem.buyukluk}\n` +
            `**Yer:** ${deprem.yer}\n` +
            `**Şehir:** ${deprem.sehir}`
          ).join('\n\n')
        );

      await message.channel.send({ embeds: [embed] });
    } else {
      await message.channel.send('Deprem verisi bulunamadı.');
    }
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
  description: 'Son depremleri gösterir.'
};
