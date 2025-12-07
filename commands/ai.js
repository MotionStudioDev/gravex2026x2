const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateText } = require('ai'); // ANA PAKET
const { xai } = require('@ai-sdk/xai'); // xAI PROVIDER

const XAI_API_KEY = process.env.XAI_API_KEY;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const BUTTON_TIMEOUT = 300000;
const MAX_HISTORY_TURNS = 10;

if (!XAI_API_KEY) {
    console.error("HATA: XAI_API_KEY .env dosyasından yüklenemedi!");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getFormattedTime = () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

function getOrCreateChatHistory(client, userId) {
    if (!client.userHistories) client.userHistories = new Map();
    if (!client.userHistories.has(userId)) {
        client.userHistories.set(userId, []);
    }
    return client.userHistories.get(userId);
}

module.exports.run = async (client, message, args) => {
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

    let history = getOrCreateChatHistory(client, userId);
    let lastError = null;
    let finalAnswer = null;

    if (history.length / 2 >= MAX_HISTORY_TURNS) {
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

    history.push({ role: 'user', content: query });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const { text } = await generateText({
                model: xai('grok-4'), // xAI modeli
                messages: history,
                system: "Sen Grave adlı Discord botunun yapay zeka asistanısın. Kısa, bilgilendirici, esprili ve Türkçe cevap ver.",
                temperature: 0.7,
                maxTokens: 4096,
            });

            finalAnswer = text.trim();
            if (finalAnswer.length > 4000) {
                finalAnswer = finalAnswer.substring(0, 3990) + "\n\n... (devamı kesildi)";
            }

            history.push({ role: 'assistant', content: finalAnswer });
            break;

        } catch (error) {
            lastError = error;
            console.error("Grok API Hatası:", error.message || error);

            history.pop();

            const isRateLimit = error.status === 429 || String(error.message).toLowerCase().includes('rate limit');

            if (isRateLimit && attempt < MAX_RETRIES - 1) {
                const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
                const waiting = new EmbedBuilder()
                    .setColor('Orange')
                    .setDescription(`🚨 Rate limit! ${Math.round(backoff/1000)} saniye bekleniyor... (${attempt + 1}/${MAX_RETRIES})`);
                await msg.edit({ embeds: [waiting] }).catch(() => {});
                await sleep(backoff);
            } else {
                client.userHistories.delete(userId);
                break;
            }
        }
    }

    if (finalAnswer) {
        const resultEmbed = new EmbedBuilder()
            .setColor('#00ff9d')
            .setTitle('Grave • Grok Cevabı')
            .addFields(
                { name: 'Soru', value: `\`${query}\``, inline: false },
                { name: 'Cevap', value: finalAnswer, inline: false }
            )
            .setFooter({ text: `Powered by xAI Grok • ${message.author.tag} | ${getFormattedTime()}` })
            .setTimestamp();

        const finalMsg = await msg.edit({ embeds: [resultEmbed], components: [row] });

        const collector = finalMsg.createMessageComponentCollector({
            filter: i => i.customId === 'grok_reset',
            time: BUTTON_TIMEOUT
        });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: "Bu buton sadece soruyu soran kişi içindir.", ephemeral: true });
            }

            client.userHistories.delete(userId);

            const success = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ Hafıza Sıfırlandı')
                .setDescription('Yeni bir sohbet başlatabilirsin.');

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('grok_reset')
                    .setLabel('Sıfırlandı')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );

            await i.update({ embeds: [success], components: [disabledRow] });
            collector.stop();
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'time' && finalMsg.editable) {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('grok_reset')
                        .setLabel('Süre Doldu')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(true)
                );
                await finalMsg.edit({ components: [disabledRow] }).catch(() => {});
            }
        });

    } else {
        const errorEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Grok’a Bağlanılamadı')
            .setDescription('API’de bir sorun oluştu, oturum sıfırlandı.')
            .addFields({ name: 'Hata', value: `\`\`\`${lastError?.message || 'Bilinmeyen hata'}\`\`\`` });

        await msg.edit({ embeds: [errorEmbed], components: [] });
    }
};

module.exports.conf = { aliases: ['ai', 'grok', 'sor'] };
module.exports.help = { name: 'sor' };
