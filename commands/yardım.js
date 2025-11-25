const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

module.exports.run = async (client, message) => {
  try {
    // Canvas boyutu
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Arka plan
    ctx.fillStyle = '#2C2F33'; // Discord koyu gri
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Başlık
    ctx.fillStyle = '#7289DA'; // Discord mavi
    ctx.font = 'bold 36px Sans';
    ctx.fillText('Grave Yardım Menüsü', 220, 60);

    // Prefix bilgisi
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Sans';
    ctx.fillText('Prefix: g! (Örnek: g!yardım)', 260, 100);

    // Kategoriler
    const kategoriler = {
      Genel: '`ping`, `istatistik`, `uptime`, `hatırlat`, `hata-bildir`, `yardım`',
      Kullanıcı: '`avatar`, `profil`, `deprem`, `döviz`, `emoji-bilgi`, `emojiler`',
      Moderasyon: '`ban`, `kick`, `sil`, `rol-ver`, `rol-al`, `temizle`, `uyar`',
      Sistem: '`sayaç`, `reklam-engel`, `level-sistemi`, `küfür-engel`, `anti-raid`, `kayıt-sistemi`, `otorol`, `sa-as`, `ses-sistemi`, `slowmode`, `emoji-log`',
      Sahip: '`reload`, `mesaj-gönder`'
    };

    let y = 160;
    for (const [kategori, komutlar] of Object.entries(kategoriler)) {
      ctx.fillStyle = '#FFD700'; // Altın sarısı başlık
      ctx.font = 'bold 26px Sans';
      ctx.fillText(kategori, 60, y);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px Sans';
      ctx.fillText(komutlar, 60, y + 30);

      y += 80;
    }

    // Footer
    ctx.fillStyle = '#99AAB5';
    ctx.font = '18px Sans';
    ctx.fillText('GraveBOT 2026', 330, 570);

    // Görseli ekle
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'yardim.png' });
    const embed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('📖 Grave Yardım Menüsü')
      .setImage('attachment://yardim.png');

    await message.channel.send({ embeds: [embed], files: [attachment] });
  } catch (err) {
    console.error('Yardım komutu hatası:', err);
    message.channel.send('⚠️ | Yardım menüsü oluşturulurken bir hata oluştu.');
  }
};

module.exports.conf = {
  aliases: ['help', 'yardim']
};

module.exports.help = {
  name: 'yardım'
};
