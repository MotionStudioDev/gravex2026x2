const { EmbedBuilder } = require('discord.js');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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",
  defaultHeaders: {
    "HTTP-Referer": "https://grave-bot.com",
    "X-Title": "Grave Bot",
  }
});

module.exports.run = async (client, message, args) => {
  const prompt = args.join(' ');
  if (!prompt) return message.reply('❌ **Hata:** Analiz etmem için bir soru sorman gerekiyor!');

  // Başlangıç Yükleme Embed'i (Senin istediğin stil)
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ **MotionAI** verileri analiz ediyor... Lütfen bekleyin.');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  // Discord "Yazıyor..." efekti
  await message.channel.sendTyping();

  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      // Senin istediğin özel ücretsiz model
      model: "tngtech/deepseek-r1t2-chimera:free", 
      messages: [
        { 
          role: "system", 
          content: "Sen Grave asistanısın. DeepSeek Chimera altyapısını kullanan, mantıksal ve teknik bir yardımcımsın. Yanıtlarını adım adım düşünerek ver." 
        },
        { role: "user", content: prompt }
      ],
      // Ücretsiz modellerde bazen limitler olabilir, bu yüzden token'ı dengeli tutuyoruz
      max_tokens: 2000 
    });

    const aiResponse = completion.choices[0].message.content;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const resultEmbed = new EmbedBuilder()
      .setColor('#00ffaa') // Chimera temasına uygun neon yeşil
      .setAuthor({ 
        name: `${message.author.username} sordu`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      })
      .setTitle('🧠 Grave Analiz')
      .setDescription(aiResponse.length > 4000 ? aiResponse.substring(0, 4000) + '...' : aiResponse)
      .addFields(
        { name: '⏱️ Süre', value: `\`${duration}sn\``, inline: true },
        { name: '🔋 Maliyet', value: `\`Ücretsiz (Free)\``, inline: true },
        { name: '📡 Model', value: `\`MotionAI R1\``, inline: true }
      )
      .setFooter({ text: 'Grave AI • Veriler analiz edildi.', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error('Chimera API Hatası:', error);

    const errorEmbed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('⚠️ Analiz Başarısız')
      .setDescription('Ücretsiz model şu an yoğun olabilir veya API hatası oluştu. Lütfen tekrar deneyin.');
    
    await msg.edit({ embeds: [errorEmbed] });
  }
};

module.exports.help = { name: 'sor' };
module.exports.conf = { aliases: ['ai', 'ask', 'chimera'] };
