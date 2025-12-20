const { EmbedBuilder } = require('discord.js');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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", // Önceki anahtarın geçersiz olduğu için yenisini almalısın
  defaultHeaders: {
    "HTTP-Referer": "https://grave-bot.com",
    "X-Title": "Grave Bot MiMo",
  }
});

module.exports.run = async (client, message, args) => {
  const prompt = args.join(' ');
  if (!prompt) return message.reply('❌ **Hata:** Lütfen Xiaomi MiMo modeline sormak istediğiniz şeyi yazın!');

  // Senin imzan olan yükleme embed'i
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ **Xiaomi MiMo-V2** verileri analiz ediyor... Lütfen bekleyin.');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  // Botun yazıyor durumunu başlat
  await message.channel.sendTyping();

  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      // İstediğin özel ücretsiz model
      model: "xiaomi/mimo-v2-flash:free", 
      messages: [
        { 
          role: "system", 
          content: "Sen Grave asistanısın. Xiaomi MiMo altyapısını kullanan, hızlı ve yardımcı bir yapay zekasın." 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500
    });

    const aiResponse = completion.choices[0].message.content;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const resultEmbed = new EmbedBuilder()
      .setColor('#ff4a00') // Xiaomi'nin turuncu rengi
      .setAuthor({ 
        name: `${message.author.username} sordu`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      })
      .setTitle('🧠 MiMo-V2 Flash Analiz')
      .setDescription(aiResponse.length > 4000 ? aiResponse.substring(0, 4000) + '...' : aiResponse)
      .addFields(
        { name: '⚡ Hız', value: `\`${duration} Saniye\``, inline: true },
        { name: '💎 Durum', value: `\`Tamamen Ücretsiz\``, inline: true }
      )
      .setFooter({ text: 'Grave AI • Xiaomi MiMo-V2 Altyapısı', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error('MiMo API Hatası:', error);
    
    // Hataları yakalayalım
    if (error.status === 401) {
      return msg.edit({ content: '❌ **API Hatası:** Anahtarın (Key) geçersiz veya silinmiş. Lütfen OpenRouter\'dan yeni bir key al!', embeds: [] });
    }
    
    const errorEmbed = new EmbedBuilder()
      .setColor('Red')
      .setDescription('❌ Şu an bu modele ulaşılamıyor. Ücretsiz model sınırlarına takılmış olabilirsin.');
    
    await msg.edit({ embeds: [errorEmbed] });
  }
};

module.exports.help = { name: 'sor' };
module.exports.conf = { aliases: ['mimo', 'ai', 'gpt'] };
