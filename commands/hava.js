const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message, args) => {
  try {
    if (args.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('⚠️ Hava Durumu')
        .setDescription('Lütfen bir şehir girin. Örn: `!hava İzmir`')
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    const sehir = args[0].toLowerCase();

    async function getirTahmin(sehir) {
      const url = `https://api.collectapi.com/weather/getWeather?data.lang=tr&data.city=${encodeURIComponent(sehir)}`;
      const { data } = await axios.get(url, {
        headers: {
          authorization: `apikey ${process.env.COLLECTAPI_KEY}`, // .env’den çekiyoruz
          "content-type": "application/json"
        }
      });
      if (!data || !data.result) throw new Error("Geçersiz hava durumu yanıtı alındı.");
      return data.result;
    }

    let tahminler = await getirTahmin(sehir);
    let page = 0;

    const renkSec = (hava) => {
      const h = (hava || '').toLowerCase();
      if (h.includes('güneş')) return 0xFFD700;
      if (h.includes('yağmur')) return 0x1E90FF;
      if (h.includes('bulut')) return 0x808080;
      if (h.includes('fırtına')) return 0xFF4500;
      return 0x00FF7F;
    };

    const generateEmbed = (page) => {
      const gun = tahminler[page];
      if (!gun) {
        return new EmbedBuilder()
          .setColor(0xFF4500)
          .setTitle(`🌤 ${sehir} Hava Durumu (Gün ${page + 1})`)
          .setDescription('Bu gün için tahmin verisi bulunamadı.')
          .setTimestamp();
      }

      return new EmbedBuilder()
        .setColor(renkSec(gun.description))
        .setTitle(`🌤 ${sehir.toUpperCase()} Hava Durumu (${gun.day})`)
        .setThumbnail(gun.icon)
        .setDescription(
          `**Durum:** ${gun.description}\n` +
          `**Sıcaklık:** ${gun.degree}°C\n` +
          `**Min:** ${gun.min}°C | **Max:** ${gun.max}°C\n` +
          `**Gece:** ${gun.night}°C\n` +
          `**Nem:** ${gun.humidity}%`
        )
        .setFooter({ text: `Son güncelleme: ${new Date().toLocaleString('tr-TR')} • CollectAPI` })
        .setTimestamp();
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Geri').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('refresh').setLabel('🔄 Yenile').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('next').setLabel('İleri ➡️').setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({ embeds: [generateEmbed(page)], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 60_000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        const embed = new EmbedBuilder()
          .setColor(0xFF4500)
          .setTitle('⚠️ Yetkisiz Kullanım')
          .setDescription('Bu butonları sadece komutu kullanan kişi kullanabilir.')
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (interaction.customId === 'prev') {
        page = page > 0 ? page - 1 : page;
      } else if (interaction.customId === 'next') {
        if (page + 1 < tahminler.length) page++;
      } else if (interaction.customId === 'refresh') {
        try {
          tahminler = await getirTahmin(sehir);
          page = 0;
        } catch (e) {
          const embed = new EmbedBuilder()
            .setColor(0xFF4500)
            .setTitle('❌ Yenileme Hatası')
            .setDescription('Yenileme sırasında veri alınamadı.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }

      await interaction.update({ embeds: [generateEmbed(page)], components: [row] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });

  } catch (error) {
    console.error('Hava durumu alınırken hata:', error);
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Hata')
      .setDescription('Hava durumu verisi alınırken bir hata oluştu.')
      .setTimestamp();
    await message.channel.send({ embeds: [embed] });
  }
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'hava', description: 'Girilen şehir için CollectAPI üzerinden hava tahminini gösterir.' };
