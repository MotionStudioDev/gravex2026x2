const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const sesKanali = message.member.voice.channel;
  if (!sesKanali) return message.reply("❌ Önce bir ses kanalına girmelisin!");

  const arama = args.join(" ");
  if (!arama) return message.reply("❌ Hangi şarkıyı çalayım? (Örn: g!şarkı-çal Tarkan)");

  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Şarkı aranıyor, lütfen bekleyin...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    // Distube her şeyi (Arama + Bağlanma + Oynatma) tek satırda yapar
    await client.distube.play(sesKanali, arama, {
      message,
      textChannel: message.channel,
      member: message.member,
    });

    // Başarıyla sıraya eklendiğinde mesajı güncelle
    const resultEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('📡 Grave Müzik Sistemi')
      .setDescription(`✅ **${arama}** başarıyla hazırlandı ve sıraya alındı.`)
      .setFooter({ text: 'GraveBOT • Keyifli Dinlemeler' });

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error("Müzik Hatası:", error.message);
    
    // Render IP Engeli Mesajı
    if (error.message.includes('Sign in')) {
      return msg.edit({ content: "⚠️ YouTube, Render sunucusunun IP adresini engelledi. Maalesef şu an bu sunucudan çalınamıyor.", embeds: [] });
    }
    
    await msg.edit({ content: "❌ Bir hata oluştu! Botun ses kanalına katılma yetkisi olduğundan emin olun.", embeds: [] });
  }
};

module.exports.conf = { aliases: ['p', 'play', 'çal'] };
module.exports.help = { name: 'şarkı-çal' };
