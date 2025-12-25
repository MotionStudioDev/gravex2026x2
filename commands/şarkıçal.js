const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const sesKanali = message.member.voice.channel;
  if (!sesKanali) return message.reply("❌ Önce bir ses kanalına girmelisin!");

  const arama = args.join(" ");
  if (!arama) return message.reply("❌ Bir şarkı adı yazmalısın!");

  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Şarkı aranıyor ve hazırlanıyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    // Distube her şeyi otomatik yapar (Arama + Ses Çekme + Bağlanma)
    await client.distube.play(sesKanali, arama, {
      message,
      textChannel: message.channel,
      member: message.member,
    });

    const resultEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('📡 Grave Müzik Sistemi')
      .setDescription(`✅ **${arama}** sıraya eklendi!`)
      .setFooter({ text: 'GraveBOT • Müzik Keyfi' });

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error(error);
    // Render IP engeli varsa bu mesaj düşer
    if (error.message.includes('Sign in')) {
        return msg.edit("⚠️ YouTube, Render sunucusunun IP adresini engelledi. Şu anlık çalınamıyor.");
    }
    await msg.edit("❌ Bir hata oluştu! Botun ses yetkilerini kontrol edin.");
  }
};

module.exports.conf = { aliases: ['p', 'play', 'çal'] };
module.exports.help = { name: 'şarkı-çal' };
