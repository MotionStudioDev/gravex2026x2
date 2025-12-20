const { EmbedBuilder } = require('discord.js');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  baseURL: "https://api.xiaomimimo.com/v1",
  apiKey: "sk-s4qnnx4bry5839nid72niqle9naflk29y7r23103ktswtosj",
});

module.exports.run = async (client, message, args) => {
  const prompt = args.join(' ');
  if (!prompt) return message.reply('❌ Lütfen bir soru sorun!');

  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Grave analiz yapıyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    const completion = await openai.chat.completions.create({
      // HATA BURADAYDI: Model adını Xiaomi'nin desteklediği 'mimo-v2-flash' olarak güncelledim.
      // Eğer panelde farklı bir isim (örn: mimo-v1) görüyorsan onu yazmalısın.
      model: "mimo-v2-flash", 
      messages: [
        { role: "system", content: "Sen Grave asistanısın." },
        { role: "user", content: prompt }
      ],
    });

    const resultEmbed = new EmbedBuilder()
      .setColor('#ff4a00')
      .setTitle('🚀 GraveAI Yanıtı')
      .setDescription(completion.choices[0].message.content);

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error('Xiaomi API Hatası:', error);

    // Eğer yine model hatası verirse, kullanıcıya hangi modelin desteklenmediğini söyleyelim
    if (error.status === 400) {
      return msg.edit(`❌ **Parametre Hatası:** Gönderilen model ismi (\`mimo-v2-flash\`) sistem tarafından kabul edilmedi. Lütfen Xiaomi panelinden doğru model adını kontrol et.`);
    }

    await msg.edit('❌ Bir hata oluştu.');
  }
};

module.exports.help = { name: 'yapayzeka' };
module.exports.conf = { aliases: ['mi'] };
