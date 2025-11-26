const { EmbedBuilder } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: "AIzaSyAGwSxAi53QUpeqoFNCtpvH-z3XYxzmy3U" });

module.exports.run = async (client, message, args) => {
  try {
    if (args.length < 2) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Kullanım Hatası')
            .setDescription('Doğru kullanım: `g!çeviri <metin> <hedef-dil>`\n\nÖrnek: `g!çeviri merhaba ingilizce`')
        ]
      });
    }

    const metin = args[0];
    const hedefDil = args[1].toLowerCase();

    const ceviri = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: `"${metin}" metnini ${hedefDil} diline çevir. Sadece çeviriyi yaz, başka bir şey yazma.`,
      config: {
        systemInstruction: 'Sadece çeviriyi yaz, başka bir şey yazma.',
      },
    });

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🌐 Çeviri')
      .addFields(
        { name: '📝 Orijinal Metin', value: metin },
        { name: `🔄 ${hedefDil.charAt(0).toUpperCase() + hedefDil.slice(1)} Çevirisi`, value: ceviri.text }
      )
      .setFooter({
        text: message.author.tag,
        iconURL: message.author.displayAvatarURL()
      })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });

  } catch (error) {
    console.error('Çeviri hatası:', error);
    await message.channel.send('❌ Çeviri yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
  }
};

module.exports.conf = { aliases: ['translate', 'ceviri'] };
module.exports.help = { name: 'çeviri' };
