const { EmbedBuilder } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');

// ⚠️ API Anahtarını doğrudan koddan kaldırdık! Artık .env dosyasından okunuyor.
// Eğer API anahtarı yüklenemezse hata fırlat.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

if (!GEMINI_API_KEY) {
    console.error("HATA: GEMINI_API_KEY çevresel değişkeni yüklenemedi. Lütfen .env dosyanızı kontrol edin.");
    // Botun bu komutu çalıştırmasını engellemek için hata fırlatılabilir veya işlem durdurulabilir.
}

// Gemini AI istemcisini başlat
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const modelName = 'gemini-2.5-flash';

module.exports.run = async (client, message, args) => {
    const query = args.join(' ');
    
    if (!query) {
        return message.reply("Lütfen sormak istediğiniz soruyu belirtin. Örn: `g!sor Yapay zeka nedir?`");
    }

    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Cevabınız analiz ediliyor...');
        
    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: query,
        });

        let answer = response.text.trim();
        
        // Yanıt çok uzunsa kısaltma
        if (answer.length > 4096) {
             answer = answer.substring(0, 4000) + '... (Yanıt çok uzun, devamı kesildi.)';
        }
        
        const resultEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('✨ Yapay Zeka Cevabı')
            .addFields(
                { name: 'Soru', value: `\`${query}\``, inline: false },
                { name: 'Cevap', value: answer, inline: false }
            )
            .setFooter({ text: `Powered by Gemini | ${message.author.tag}` });

        await msg.edit({ embeds: [resultEmbed] });

    } catch (error) {
        console.error("Gemini AI Hatası:", error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Hata Oluştu')
            .setDescription('Yapılan sorguya cevap alınamadı. Lütfen API anahtarınızı veya konsoldaki hata mesajlarını kontrol edin.');
            
        await msg.edit({ embeds: [errorEmbed] });
    }
};

module.exports.conf = {
    aliases: ['ai', 'yapay-zeka', 'soru-cevap']
};

module.exports.help = {
    name: 'sor'
};
