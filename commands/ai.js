const { EmbedBuilder } = require('discord.js');
const { OpenAI } = require('openai');

// Xiaomi MiMo Resmi API Yapılandırması
const openai = new OpenAI({
  baseURL: "https://api.xiaomimimo.com/v1", // Xiaomi'nin resmi API uç noktası
  apiKey: "sk-s4qnnx4bry5839nid72niqle9naflk29y7r23103ktswtosj", // Yeni aldığın key
});

module.exports.run = async (client, message, args) => {
  const prompt = args.join(' ');
  if (!prompt) return message.reply('❌ **Hata:** Xiaomi MiMo asistanına ne sormak istersin?');

  // Senin imzan olan yükleme embed'i
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ **Xiaomi MiMo Resmi Servisi** verileri analiz ediyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  // Botun yazıyor durumunu başlat
  await message.channel.sendTyping();

  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model: "mimo-v2", // Xiaomi platformundaki model adın (V2 Flash veya V2)
      messages: [
        { 
          role: "system", 
          content: "Sen Grave asistanısın. Xiaomi MiMo resmi API'sini kullanıyorsun. Hızlı, çözüm odaklı ve kibar bir asistan ol." 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0].message.content;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const resultEmbed = new EmbedBuilder()
      .setColor('#ff4a00') // Xiaomi Turuncusu
      .setAuthor({ 
        name: `${message.author.username} sordu`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      })
      .setTitle('🚀 Xiaomi MiMo Resmi Yanıtı')
      .setDescription(aiResponse.length > 4000 ? aiResponse.substring(0, 4000) + '...' : aiResponse)
      .addFields(
        { name: '⚡ İşlem Süresi', value: `\`${duration}s\``, inline: true },
        { name: '📡 Kaynak', value: `\`Official Xiaomi API\``, inline: true }
      )
      .setFooter({ text: 'Grave AI • Xiaomi Cloud Computing', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    await msg.edit({ embeds: [resultEmbed] });

  } catch (error) {
    console.error('Xiaomi API Hatası:', error);

    // Hata yönetimi
    if (error.status === 401) {
      return msg.edit({ content: '❌ **HATA:** Xiaomi API Key reddedildi! Lütfen panelden anahtarın aktifliğini kontrol et.', embeds: [] });
    }
    
    if (error.status === 404) {
      return msg.edit({ content: '❌ **HATA:** Model adı hatalı veya API adresi değişmiş olabilir.', embeds: [] });
    }

    await msg.edit({ content: '❌ Xiaomi servislerine bağlanırken teknik bir hata oluştu.', embeds: [] });
  }
};

module.exports.help = { name: 'sor' };
module.exports.conf = { aliases: ['mimo', 'mi', 'ai'] };
