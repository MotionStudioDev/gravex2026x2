const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message, args) => {
  try {
    if (args.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('⚠️ Hava Durumu')
        .setDescription('Lütfen bir il veya ilçe girin.\nÖrn: `!hava İzmir Çiğli`')
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    const sehir = args[0];
    const ilce = args[1] ? args[1] : '';
    const konum = `${sehir}${ilce ? ' ' + ilce : ''}`;

    async function getirTahmin(konum) {
      const url = `https://wttr.in/${encodeURIComponent(konum)}?format=j1`;
      const { data } = await axios.get(url, { timeout: 10000 });
      if (!data || !data.weather || !Array.isArray(data.weather)) {
        throw new Error('Geçersiz hava durumu yanıtı alındı.');
      }
      return data.weather;
    }

    let tahminler = await getirTahmin(konum);
    let page = 0;

    const renkSec = (hava) => {
      const h = (hava || '').toLowerCase();
      if (h.includes('sunny') || h.includes('güneş')) return 0xFFD700;
      if (h.includes('rain') || h.includes('yağmur')) return 0x1E90FF;
      if (h.includes('cloud') || h.includes('bulut')) return 0x808080;
      if (h.includes('storm') || h.includes('fırtına')) return 0xFF4500;
      return 0x00FF7F;
    };

    const getSlotSafe = (hourly, idx) => {
      const s = Array.isArray(hourly) ? hourly[idx] : null;
      if (!s) return { weatherDesc: [{ value: 'Veri yok' }], tempC: '-', humidity: '-', windspeedKmph: '-' };
      return {
        weatherDesc: s.weatherDesc || [{ value: 'Veri yok' }],
        tempC: s.tempC ?? '-',
        humidity: s.humidity ?? '-',
        windspeedKmph: s.windspeedKmph ?? '-',
      };
    };

    const generateEmbed = (page) => {
      const gun = tahminler[page];
      if (!gun) {
        return new EmbedBuilder()
          .setColor(0xFF4500)
          .setTitle(`🌤 ${konum} Hava Durumu (Gün ${page + 1})`)
          .setDescription('Bu gün için tahmin verisi bulunamadı.')
          .setFooter({ text: `Son güncelleme: ${new Date().toLocaleString('tr-TR')} • 81 il ve ilçeler destekleniyor` })
          .setTimestamp();
      }

      const hourly = gun.hourly || [];
      const gece = getSlotSafe(hourly, 0);
      const sabah = getSlotSafe(hourly, 2);
      const oglen = getSlotSafe(hourly, 4);
      const aksam = getSlotSafe(hourly, 6);

      const havaGenel = (oglen.weatherDesc[0]?.value) || (sabah.weatherDesc[0]?.value) || 'Veri yok';
      const ortalama = (gun.avgtempC != null ? `${gun.avgtempC}°C` : '-');
      const min = (gun.mintempC != null ? `${gun.mintempC}°C` : '-');
      const max = (gun.maxtempC != null ? `${gun.maxtempC}°C` : '-');

      return new EmbedBuilder()
        .setColor(renkSec(havaGenel))
        .setTitle(`🌤 ${konum} Hava Durumu (Gün ${page + 1})`)
        .setDescription(
          `**Durum (Genel):** ${havaGenel}\n` +
          `**Ortalama:** ${ortalama} | **Min:** ${min} | **Max:** ${max}\n\n` +
          `🌙 **Gece:** ${gece.weatherDesc[0].value}, ${gece.tempC}°C, Nem: ${gece.humidity}%\n` +
          `🌅 **Sabah:** ${sabah.weatherDesc[0].value}, ${sabah.tempC}°C, Nem: ${sabah.humidity}%\n` +
          `☀️ **Öğlen:** ${oglen.weatherDesc[0].value}, ${oglen.tempC}°C, Nem: ${oglen.humidity}%\n` +
          `🌇 **Akşam:** ${aksam.weatherDesc[0].value}, ${aksam.tempC}°C, Nem: ${aksam.humidity}%`
        )
        .setFooter({ text: `Son güncelleme: ${new Date().toLocaleString('tr-TR')} • 81 il ve ilçeler destekleniyor` })
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
          tahminler = await getirTahmin(konum);
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
module.exports.help = { name: 'hava', description: 'Girilen il/ilçe için 5 günlük hava tahminini gösterir (sabah/öğlen/akşam/gece, min/max).' };
