const { EmbedBuilder } = require('discord.js');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: 'cc25c34d20b54b2eb76fb7795fc7d20b',
  baseURL: 'https://api.aimlapi.com',
});

module.exports.run = async (client, message, args) => {
  const prompt = args.join(' ');
  if (!prompt) return message.reply('❌ **Hey!** Bana bir şeyler sorman gerekiyor. Örn: `!sor Discord botu nasıl yapılır?`');

  // 1. Bekleme Embed'i
  const loadingEmbed = new EmbedBuilder()
    .setColor('Orange')
    .setAuthor({ name: 'Zihin Okunuyor...', iconURL: 'https://i.getlyrical.com/i/loading_ai.gif' }) // Varsa bir loading animasyonu
    .setDescription('⏳ Veriler işleniyor ve en iyi yanıt hazırlanıyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  // Discord'da "Bot Yazıyor..." simgesini başlat
  await message.channel.sendTyping();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', 
      messages: [
        { 
          role: 'system', 
          content: 'Sen "Grave" isimli gelişmiş bir Discord asistanısın. Yardımsever, zeki ve bazen hafif esprili bir dil kullanmalısın. Yanıtlarını Markdown kullanarak (kalın yazı, listeler vb.) süsle.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7, // Yanıtın yaratıcılık dengesi
      max_tokens: 1500  // Çok uzun olup krediyi aniden bitirmemesi için sınır
    });

    const aiResponse = completion.choices[0].message.content;

    // 2. Başarılı Sonuç Embed'i
    const resultEmbed = new EmbedBuilder()
      .setColor('#5865F2') // Discord Blurple rengi
      .setAuthor({ 
        name: `${message.author.username} sordu:`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      })
      .setTitle(' Grave Yapay Zeka')
      .setDescription(aiResponse.length > 4000 ? aiResponse.substring(0, 4000) + '...' : aiResponse)
      .addFields({ name: '💬 Senin Sorun', value: `\`\`\`${prompt.substring(0, 1024)}\`\`\`` })
      .setFooter({ text: 'Powered by MotionAI • GPT-4o Model', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error('AI Hatası:', error);

    // Kredi bittiyse veya bakiye yetersizse özel hata mesajı
    if (error.status === 403) {
      const bakiyeEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('⚠️ Sistem Bakiyesi Tükendi')
        .setDescription('Yapay zeka motorunun kredisi bittiği için şu an yanıt veremiyorum. Lütfen yöneticiye bakiye yüklemesi yapmasını iletin.');
      return msg.edit({ embeds: [bakiyeEmbed] });
    }

    const errorEmbed = new EmbedBuilder()
      .setColor('Red')
      .setDescription('❌ Üzgünüm, zihnimde bir kısa devre oluştu. Lütfen biraz sonra tekrar dene!');
    
    await msg.edit({ embeds: [errorEmbed] });
  }
};

module.exports.help = { name: 'sor' };
module.exports.conf = { aliases: ['ai', 'gpt', 'ask'] };
