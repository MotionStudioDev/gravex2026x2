const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');

// ⚠️ .env dosyanızdan GEMINI_API_KEY değişkenini çeker.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const MAX_RETRIES = 3; 
const INITIAL_BACKOFF_MS = 1000; 
const BUTTON_TIMEOUT = 300000; // 5 dakika
const MAX_HISTORY_TURNS = 10; // 10 soru-cevap çiftinden sonra uyarı verir

// API Anahtarı Kontrolü
if (!GEMINI_API_KEY) {
    console.error("HATA: GEMINI_API_KEY çevresel değişkeni yüklenemedi. Lütfen .env dosyanızı kontrol edin.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const modelName = 'gemini-2.5-flash';

// Yardımcı fonksiyon: Belirtilen süre kadar bekler
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Kullanıcının sohbet oturumunu alır veya oluşturur.
 * NOT: Bu fonksiyon, client.userSessions'ın run içinde başlatıldığını varsayar.
 * @param {object} client - Discord Client objesi.
 * @param {string} userId - Discord kullanıcısının ID'si.
 * @returns {object} - Gemini Chat Session objesi.
 */
function getOrCreateChatSession(client, userId) {
    let chat = client.userSessions.get(userId);
    
    if (!chat) {
        chat = ai.chats.create({
            model: modelName,
            config: {
                 systemInstruction: "Sen Grave adlı bir Discord botunun yapay zeka asistanısın. Kısa, bilgilendirici ve ilgili dilde cevaplar ver. Kullanıcının önceki sorularını hatırla.",
            }
        });
        client.userSessions.set(userId, chat);
    }
    return chat;
}

module.exports.run = async (client, message, args) => {
    // --- BAŞLANGIÇ KONTROLÜ (Hafıza Yönetimi DÜZELTİLDİ) ---
    // client objesi artık burada tanımlıdır.
    if (!client.userSessions) {
        client.userSessions = new Map();
    }
    // --------------------------------------------------------
    
    // API anahtarı yoksa komutu çalıştırma
    if (!GEMINI_API_KEY) {
        return message.reply("❌ Yapay zeka sistemi API anahtarı eksik olduğu için devre dışıdır.");
    }
    
    const query = args.join(' ');
    const userId = message.author.id;
    
    if (!query) {
        return message.reply("Lütfen sormak istediğiniz soruyu belirtin. Örn: `g!sor Yapay zeka nedir?`");
    }

    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Cevabınız analiz ediliyor...');
        
    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    let chat = getOrCreateChatSession(client, userId);
    let lastError = null;
    
    // Geçmiş uyarısı
    if (chat.getHistory().length / 2 >= MAX_HISTORY_TURNS) {
        const resetEmbed = new EmbedBuilder()
            .setColor('Orange')
            .setDescription(`⚠️ Sohbet geçmişi çok uzadı (${MAX_HISTORY_TURNS} soru-cevap). Yeni bir konu için lütfen alttaki **Hafızayı Sıfırla** butonunu kullanın.`);
        message.channel.send({ embeds: [resetEmbed] }).catch(() => {});
    }
    
    // Butonları oluştur
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ai_reset').setLabel('🧠 Hafızayı Sıfırla').setStyle(ButtonStyle.Danger)
    );
    
    // Geri Çekilme ve Yeniden Deneme Döngüsü
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // API Çağrısı
            const response = await chat.sendMessage({ message: query });

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
                .setFooter({ text: `Powered by Gemini | ${message.author.tag} | Konuşma Hafızalı` });

            await msg.edit({ embeds: [resultEmbed], components: [row] });
            
            // --- BUTON DİNLEYİCİSİ (COLLECTOR) ---
            const collector = msg.createMessageComponentCollector({
                filter: i => i.customId === 'ai_reset',
                time: BUTTON_TIMEOUT
            });
            
            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: 'Bu butonu sadece işlemi başlatan kişi kullanabilir.', ephemeral: true });
                }

                // Sohbet oturumunu silerek sıfırla
                client.userSessions.delete(userId);
                
                const resetSuccessEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ Sohbet Hafızası Sıfırlandı')
                    .setDescription('Yeni bir konuya başlayabilirsiniz.')
                    .setFooter({ text: `Powered by Gemini | ${message.author.tag}` });
                
                // Butonu devre dışı bırak
                const disabledRow = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(row.components[0]).setDisabled(true).setLabel('Hafıza Sıfırlandı')
                );

                await i.update({ embeds: [resetSuccessEmbed], components: [disabledRow] });
                collector.stop(); 
            });
            
            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    // Süre dolduğunda butonu devre dışı bırak
                    const disabledRow = new ActionRowBuilder().addComponents(
                        ButtonBuilder.from(row.components[0]).setDisabled(true).setLabel('Süre Doldu')
                    );
                    await msg.edit({ components: [disabledRow] }).catch(() => {});
                }
            });

            return; // Komut başarıyla tamamlandı

        } catch (error) {
            lastError = error;

            const isRateLimit = error.message && (error.message.includes('429') || error.message.toLowerCase().includes('rate limit'));

            if (isRateLimit && attempt < MAX_RETRIES - 1) {
                const backoffTime = INITIAL_BACKOFF_MS * (2 ** attempt);
                
                const waitingEmbed = new EmbedBuilder()
                    .setColor('Orange')
                    .setDescription(`🚨 Rate Limit! Yeniden deneme için ${Math.round(backoffTime / 1000)} saniye bekleniyor... (Deneme: ${attempt + 1}/${MAX_RETRIES})`);
                
                await msg.edit({ embeds: [waitingEmbed] }).catch(() => {});
                await sleep(backoffTime);
                
            } else {
                // Hata durumunda oturumu sıfırla ve döngüyü kır
                client.userSessions.delete(userId);
                break; 
            }
        }
    }

    // --- Son Hata Mesajı (Tüm Denemeler Başarısız Olursa) ---
    const finalErrorEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Sorgu Başarısız Oldu')
        .setDescription('Yapay zeka servisine bağlanılamadı veya tüm denemelerde hata oluştu. Oturumunuz sıfırlandı.')
        .addFields(
            { name: 'Hata Detayı', value: `\`\`\`${lastError ? (lastError.message || 'Bilinmeyen Hata') : 'API anahtarı eksik.'}\`\`\`` }
        )
        .setFooter({ text: 'Lütfen daha sonra tekrar deneyin.' });
        
    await msg.edit({ embeds: [finalErrorEmbed], components: [] });
};

module.exports.conf = {
    aliases: ['ai', 'yapay-zeka', 'soru-cevap', 'ai-soru']
};

module.exports.help = {
    name: 'sor'
};
