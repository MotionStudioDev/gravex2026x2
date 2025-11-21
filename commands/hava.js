const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message, args) => {
  try {
    if (args.length === 0) return message.channel.send('Lütfen bir il veya ilçe girin. Örn: `!hava İzmir Çiğli`');

    const sehir = args[0];
    const ilce = args[1] ? args[1] : '';
    const konum = `${sehir}${ilce ? ' ' + ilce : ''}`;

    async function getirTahmin(konum) {
      const url = `https://wttr.in/${encodeURIComponent(konum)}?format=j1`;
      const response = await axios.get(url);
      return response.data.weather; // 5 günlük tahmin listesi
    }

    let tahminler = await getirTahmin(konum);
    let page = 0;

    const renkSec = (hava) => {
      if (hava.includes('Sunny') || hava.includes('Güneş')) return 0xFFD700;
      if (hava.includes('Rain') || hava.includes('Yağmur')) return 0x1E90FF;
      if (hava.includes('Cloud') || hava.includes('Bulut')) return 0x808080;
      if (hava.includes('Storm') || hava.includes('Fırtına')) return 0xFF4500;
      return 0x00FF7F;
    };

    const generateEmbed = (page) => {
      const gun = tahminler[page];
      const hava = gun.hourly[4].weatherDesc[0].value; // öğlen ortalama
      const ortalama = gun.avgtempC + "°C";
      const min = gun.mintempC + "°C";
      const max = gun.maxtempC + "°C";

      // Günün farklı saatleri
      const sabah = gun.hourly[2]; // sabah (06:00 civarı)
      const oglen = gun.hourly[4]; // öğlen (12:00 civarı)
      const aksam = gun.hourly[6]; // akşam (18:00 civarı)
      const gece = gun.hourly[8];  // gece (00:00 civarı)

      return new EmbedBuilder()
        .setColor(renkSec(hava))
        .setTitle(`🌤 ${konum} Hava Durumu (Gün ${page + 1})`)
        .setDescription(
          `**Durum (Genel):** ${hava}\n` +
          `**Ortalama:** ${ortalama} | **Min:** ${min} | **Max:** ${max}\n\n` +
          `🌅 **Sabah:** ${sabah.weatherDesc[0].value}, ${sabah.tempC}°C, Nem: ${sabah.humidity}%\n` +
          `☀️ **Öğlen:** ${oglen.weatherDesc[0].value}, ${oglen.tempC}°C, Nem: ${oglen.humidity}%\n` +
          `🌇 **Akşam:** ${aksam.weatherDesc[0].value}, ${aksam.tempC}°C, Nem: ${aksam.humidity}%\n` +
          `🌙 **Gece:** ${gece.weatherDesc[0].value}, ${gece.tempC}°C, Nem: ${gece.humidity}%`
        )
        .setFooter({ text: `Son güncelleme: ${new Date().toLocaleString('tr-TR')} • 81 il ve ilçeler destekleniyor` })
        .setTimestamp();
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('⬅️ Geri')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('refresh')
        .setLabel('🔄 Yenile')
        .setStyle(ButtonStyle.Secondary),
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
        if (page + 1 < tahminler.length) page++;
      } else if (interaction.customId === 'refresh') {
        tahminler = await getirTahmin(konum);
        page = 0;
      }

      await interaction.update({ embeds: [generateEmbed(page)], components: [row] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });

  } catch (error) {
    console.error('Hava durumu alınırken hata:', error);
    await message.channel.send('Hava durumu verisi alınırken bir hata oluştu.');
  }
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'hava-durumu', description: 'Girilen il/ilçe için 5 günlük hava tahminini gösterir (sabah/öğlen/akşam/gece).' };
