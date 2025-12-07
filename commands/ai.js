const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Client } = require('xai-sdk'); // YENİ PAKET

const XAI_API_KEY = process.env.XAI_API_KEY;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const BUTTON_TIMEOUT = 300000; // 5 dakika
const MAX_HISTORY_TURNS = 10;

if (!XAI_API_KEY) {
    console.error("HATA: XAI_API_KEY .env dosyasından yüklenemedi!");
}

// xAI Client (OpenAI uyumlu)
const xai = new Client({ apiKey: XAI_API_KEY });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getOrCreateChatSession(client, userId) {
    let session = client.userSessions.get(userId);

    if (!session) {
        // Grok-4 veya Grok-3 seçebilirsin (grok-4 daha güçlü)
        session = xai.chat.create({
            model: "grok-4", // grok-3 de kullanabilirsin
            temperature: 0.7,
            system: "Sen Grave adlı Discord botunun yapay zeka asistanısın. Kısa, bilgilendirici, esprili ve Türkçe cevap ver. Kullanıcının önceki mesajlarını hatırla."
        });
        client.userSessions.set(userId, session);
    }
    return session;
}

module.exports.run = async (client, message, args) => {
    if (!client.userSessions) client.userSessions = new Map();

    if (!XAI_API_KEY) {
        return message.reply("❌ Grok API anahtarı eksik, bot çalışamaz.");
    }

    const query = args.join(' ');
    const userId = message.author.id;

    if (!query) {
        return message.reply("Lütfen bir soru sor! Örnek: `g!sor Grok kimdir?`");
    }

    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Grok düşünüyor...');
    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    let chat = getOrCreateChatSession(client, userId);

    // Hafıza çok uzunsa uyarı
    if (chat.history.length / 2 >= MAX_HISTORY_TURNS) {
        const warn = new EmbedBuilder()
            .setColor('Orange')
            .setDescription(`⚠️ Sohbet geçmişin çok uzadı (${MAX_HISTORY_TURNS} tur). Yeni konu için **Hafızayı Sıfırla** butonuna bas.`);
        message.channel.send({ embeds: [warn] }).catch(() => {});
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('grok_reset')
            .setLabel('🧠 Hafızayı Sıfırla')
            .setStyle(ButtonStyle.Danger)
    );

    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await chat.sample({ user: query });
            let answer = response.content.trim();

            if (answer.length > 4000) {
                answer = answer.substring(0, 3990) + "\n\n... (devamı kesildi)";
            }

            const resultEmbed = new EmbedBuilder()
                .setColor('#00ff9d')
                .setTitle('Grave • Grok Cevabı')
                .addFields(
                    { name: 'Soru', value: `\`${query}\``, inline: false },
                    { name: 'Cevap', value: answer, inline: false }
                )
                .setFooter({ text: `Powered by xAI Grok • ${message.author.tag}` })
                .setTimestamp();

            await msg.edit({ embeds: [resultEmbed], components: [row] });

            // Buton dinleyici
            const collector = msg.createMessageComponentCollector({
                filter: i => i.customId === 'grok_reset',
                time: BUTTON_TIMEOUT
            });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: "Bu buton sadece soruyu soran kişi içindir.", ephemeral: true });
                }

                client.userSessions.delete(userId);

                const success = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ Hafıza Sıfırlandı')
                    .setDescription('Yeni bir sohbet başlatabilirsin.');

                const disabledRow = ActionRowBuilder.from(row).setComponents(
                    ButtonBuilder.from(row.components[0])
                        .setLabel('Sıfırlandı').setDisabled(true)
                );

                await i.update({ embeds: [success], components: [disabledRow] });
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && msg.editable) {
                    const disabledRow = ActionRowBuilder.from(row).setComponents(
                        row.components[0].setDisabled(true).setLabel('Süre Doldu')
                    );
                    await msg.edit({ components: [disabledRow] }).catch(() => {});
                }
            });

            return;

        } catch (error) {
            lastError = error;
            console.error("Grok API Hatası:", error.message || error);

            const isRateLimit = error.status === 429 || (error.message && error.message.includes('rate limit'));

            if (isRateLimit && attempt < MAX_RETRIES - 1) {
                const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
                const waiting = new EmbedBuilder()
                    .setColor('Orange')
                    .setDescription(`Rate limit! ${Math.round(backoff/1000)} saniye bekleniyor... (${attempt + 1}/${MAX_RETRIES})`);
                await msg.edit({ embeds: [waiting] }).catch(() => {});
                await sleep(backoff);
            } else {
                client.userSessions.delete(userId);
                break;
            }
        }
    }

    // Tüm denemeler başarısızsa
    const errorEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Grok’a Bağlanılamadı')
        .setDescription('API’de bir sorun oluştu, oturum sıfırlandı.')
        .addFields({ name: 'Hata', value: `\`\`\`${lastError?.message || 'Bilinmeyen hata'}`)\`\`\`` });

    await msg.edit({ embeds: [errorEmbed], components: [] });
};

module.exports.conf = {
    aliases: ['ai', 'grok', 'sor']
};

module.exports.help = {
    name: 'yapay-zeka'
};
