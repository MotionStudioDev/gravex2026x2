const { EmbedBuilder } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');

// ⚠️ .env dosyanızdan GEMINI_API_KEY değişkenini çeker.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const MAX_RETRIES = 3; // Maksimum deneme sayısı
const INITIAL_BACKOFF_MS = 1000; // İlk bekleme süresi (1 saniye)

// API Anahtarı Kontrolü
if (!GEMINI_API_KEY) {
    console.error("HATA: GEMINI_API_KEY çevresel değişkeni yüklenemedi. Lütfen .env dosyanızı kontrol edin.");
    // Eğer anahtar yoksa, botun çökmesini önlemek için işlemciyi durdurmak yerine 
    // sadece bu komutun çalışmasını engelleyebiliriz.
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const modelName = 'gemini-2.5-flash';

// Yardımcı fonksiyon: Belirtilen süre kadar bekler
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports.run = async (client, message, args) => {
    // API anahtarı yoksa komutu çalıştırma
    if (!GEMINI_API_KEY) {
        return message.reply("❌ Yapay zeka sistemi API anahtarı eksik olduğu için devre dışıdır.");
    }
    
    const query = args.join(' ');
    
    if (!query) {
        return message.reply("Lütfen sormak istediğiniz soruyu belirtin. Örn: `g!sor Yapay zeka nedir?`");
    }

    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Cevabınız analiz ediliyor...');
        
    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    let lastError = null;
    
    // Geri Çekilme ve Yeniden Deneme Döngüsü
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // 1. API Çağrısı
            const response = await ai.models.generateContent({
                model: modelName,
                contents: query,
            });

            // Başarılı olursa döngüyü kır
            let answer = response.text.trim();
            if (answer.length > 4096) {
                 answer = answer.substring(0, 4000) + '... (Yanıt çok uzun, devamı kesildi.)';
            }
            
            const resultEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('Grave Yapay Zeka Cevabı')
                .addFields(
                    { name: 'Soru', value: `\`${query}\``, inline: false },
                    { name: 'Cevap', value: answer, inline: false }
                )
                .setFooter({ text: `Powered by MotionAI | ${message.author.tag}` });

            await msg.edit({ embeds: [resultEmbed] });
            return; // Komut başarıyla tamamlandı

        } catch (error) {
            lastError = error;

            // Hata mesajında "rate limit" veya "429" arama
            const isRateLimit = error.message && (error.message.includes('429') || error.message.toLowerCase().includes('rate limit'));

            if (isRateLimit && attempt < MAX_RETRIES - 1) {
                // Üstel olarak artan bekleme süresi (1s, 2s, 4s)
                const backoffTime = INITIAL_BACKOFF_MS * (2 ** attempt);
                
                // Kullanıcıya bilgi ver
                const waitingEmbed = new EmbedBuilder()
                    .setColor('Orange')
                    .setDescription(`🚨 Rate Limit! Yeniden deneme için ${Math.round(backoffTime / 1000)} saniye bekleniyor... (Deneme: ${attempt + 1}/${MAX_RETRIES})`);
                
                await msg.edit({ embeds: [waitingEmbed] }).catch(() => {});
                
                // Bekle
                await sleep(backoffTime);
                
            } else {
                // Rate limit değilse veya son denemeyse, döngüyü kır ve hatayı göster
                break;
            }
        }
    }

    // --- Son Hata Mesajı (Tüm Denemeler Başarısız Olursa) ---
    const finalErrorEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Sorgu Başarısız Oldu')
        .setDescription('Yapay zeka servisine bağlanılamadı veya rate limit aşıldı.')
        .addFields(
            { name: 'Hata Detayı', value: `\`\`\`${lastError ? (lastError.message || 'Bilinmeyen Hata') : 'API anahtarı eksik.'}\`\`\`` }
        )
        .setFooter({ text: 'Lütfen daha sonra tekrar deneyin.' });
        
    await msg.edit({ embeds: [finalErrorEmbed] });
};

module.exports.conf = {
    aliases: ['ai', 'yapay-zeka', 'soru-cevap']
};

module.exports.help = {
    name: 'sor'
};
