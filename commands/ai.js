const { EmbedBuilder } = require('discord.js');
const { OpenAI } = require('openai');

// API Tanımlaması
const openai = new OpenAI({
  apiKey: 'cc25c34d20b54b2eb76fb7795fc7d20b',
  baseURL: 'https://api.aimlapi.com',
});

module.exports.run = async (client, message, args) => {
  const prompt = args.join(' ');
  if (!prompt) return message.reply('❌ Lütfen bir soru sorun!');

  // Senin istediğin "Lütfen bekleyin" embed'i
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Yapay zeka yanıtı hazırlanıyor, lütfen bekleyin...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Sitede sana verilen model ismini buraya yaz
      messages: [{ role: 'user', content: prompt }],
    });

    const aiResponse = completion.choices[0].message.content;

    const resultEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🤖 Yapay Zeka Yanıtı')
      .setDescription(aiResponse.length > 4000 ? aiResponse.substring(0, 4000) + '...' : aiResponse)
      .setFooter({ text: 'Aimlapi üzerinden GPT servisi kullanıldı.' });

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error(error);
    await msg.edit({ content: '❌ API ile iletişim kurulurken bir hata oluştu!', embeds: [] });
  }
};

module.exports.help = { name: 'sor' };
module.exports.conf = { aliases: ['ai', 'gpt'] };
