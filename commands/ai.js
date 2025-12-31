const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const { OpenAI } = require('openai');

// API İstemcileri
const xiaomiClient = new OpenAI({ baseURL: "https://api.xiaomimimo.com/v1", apiKey: "sk-s4qnnx4bry5839nid72niqle9naflk29y7r23103ktswtosj" });
const mistralClient = new OpenAI({ baseURL: "https://api.mistral.ai/v1", apiKey: "KUPLDNvT7FoLfJKAEflq5vdhG0BR6j52" });
const openRouterClient = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: "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" });

module.exports.run = async (client, message, args) => {
    let currentPrompt = args.join(' ');
    if (!currentPrompt) return message.reply('❌ Lütfen yapay zekaya bir talimat verin!');

    let lastSelectedModel = null; // Seçilen modeli hafızada tutar

    const createMainMenu = (prompt) => {
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ name: 'GRAVE YAPAY ZEKA • CORE v7.5', iconURL: client.user.displayAvatarURL() })
            .setTitle('🚀 Multievrensel Analiz Protokolü')
            .setDescription(`**Mevcut Talimat:**\n\`\`\`text\n${prompt}\`\`\`\n**İşlem yapmak istediğiniz çekirdeği seçin:**`)
            .setFooter({ text: 'GraveAI | Hata koruma sistemi aktif.' });

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ai_select')
                .setPlaceholder('Analiz Çekirdeği Seçiniz...')
                .addOptions([
                    { label: 'Gemini 2.0 Flash', value: 'model_gemini', emoji: '1455928523385737403' },
                    { label: 'Llama 3.3 70B', value: 'model_llama', emoji: '1455928568960913450' },
                    { label: 'Qwen 3 4B', value: 'model_qwen', emoji: '1455931129176784957' },
                    { label: 'Nvidia Nemotron', value: 'model_nvidia', emoji: '1455930910300967074' },
                    { label: 'DeepSeek R1', value: 'model_deepseek', emoji: '1455928840156086333' },
                    { label: 'Gemma 3 27B', value: 'model_gemma', emoji: '1455928996759081012' },
                    { label: 'Mistral Small 3.1', value: 'model_mistral_small', emoji: '1455929137889017929' },
                    { label: 'Kat-Coder Pro', value: 'model_coder_free', emoji: '1455930164369428716' },
                    { label: 'Xiaomi Mimo', value: 'model_xiaomi', emoji: '1455930635930570812' }
                ])
        );
        return { embeds: [embed], components: [menu] };
    };

    let msg = await message.channel.send(createMainMenu(currentPrompt));
    const collector = msg.createMessageComponentCollector({ time: 600000 }); // 10 Dakika

    collector.on('collect', async (i) => {
        if (i.user.id !== message.author.id) return i.reply({ content: 'Bu oturum size ait değil.', ephemeral: true });

        if (i.isStringSelectMenu()) {
            await i.deferUpdate();
            lastSelectedModel = i.values[0];
            await handleAIRequest(lastSelectedModel, currentPrompt);
        }

        if (i.isButton()) {
            if (i.customId === 'del_msg') return msg.delete();
            
            if (i.customId === 'home_return') {
                await i.deferUpdate();
                return msg.edit(createMainMenu(currentPrompt));
            }

            if (i.customId === 'ask_again') {
                const modal = new ModalBuilder().setCustomId('ask_modal').setTitle('GraveAI • Hızlı Yanıt');
                const questionInput = new TextInputBuilder()
                    .setCustomId('new_question')
                    .setLabel(`Yeni Soru (${lastSelectedModel.replace('model_', '')})`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(questionInput));
                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
                if (submitted) {
                    await submitted.deferUpdate();
                    currentPrompt = submitted.fields.getTextInputValue('new_question');
                    // Seçili modeli bozmadan direkt tekrar sorgu atıyoruz
                    await handleAIRequest(lastSelectedModel, currentPrompt);
                }
            }
        }
    });

    async function handleAIRequest(selected, prompt) {
        const start = Date.now();
        const modelName = selected.replace('model_', '').toUpperCase();
        
        await msg.edit({ 
            embeds: [new EmbedBuilder().setColor('Yellow').setDescription(`📡 **${modelName}** çekirdeği işleniyor...`)], 
            components: [] 
        });

        try {
            let completion;
            let color = '#ffffff';
            let apiParams = { messages: [{ role: "system", content: "Sen Grave asistanısın." }, { role: "user", content: prompt }] };

            // API Seçimi ve İstek
            switch (selected) {
                case 'model_gemini': color = '#4285F4'; completion = await openRouterClient.chat.completions.create({ model: "google/gemini-2.0-flash-exp:free", ...apiParams }); break;
                case 'model_llama': color = '#0668E1'; completion = await openRouterClient.chat.completions.create({ model: "meta-llama/llama-3.3-70b-instruct:free", ...apiParams }); break;
                case 'model_qwen': color = '#615ced'; completion = await openRouterClient.chat.completions.create({ model: "qwen/qwen3-4b:free", ...apiParams }); break;
                case 'model_nvidia': color = '#76B900'; completion = await openRouterClient.chat.completions.create({ model: "nvidia/nemotron-3-nano-30b-a3b:free", ...apiParams }); break;
                case 'model_gemma': color = '#5F6368'; completion = await openRouterClient.chat.completions.create({ model: "google/gemma-3-27b-it:free", ...apiParams }); break;
                case 'model_mistral_small': color = '#F3D13E'; completion = await openRouterClient.chat.completions.create({ model: "mistralai/mistral-small-3.1-24b-instruct:free", ...apiParams }); break;
                case 'model_deepseek': color = '#00BFFF'; completion = await openRouterClient.chat.completions.create({ model: "tngtech/deepseek-r1t2-chimera:free", ...apiParams }); break;
                case 'model_coder_free': color = '#0099FF'; completion = await openRouterClient.chat.completions.create({ model: "kwaipilot/kat-coder-pro:free", ...apiParams }); break;
                case 'model_xiaomi': color = '#FF4A00'; completion = await xiaomiClient.chat.completions.create({ model: "mimo-v2-flash", ...apiParams }); break;
            }

            const result = completion.choices[0].message.content;
            const duration = ((Date.now() - start) / 1000).toFixed(2);

            const resEmbed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: `GraveAI • ${modelName}`, iconURL: client.user.displayAvatarURL() })
                .setDescription(result.length > 4000 ? result.substring(0, 3990) + "..." : result)
                .addFields({ name: '⏱️ Süre', value: `\`${duration}s\``, inline: true }, { name: '📊 Çekirdek', value: `\`${modelName}\``, inline: true })
                .setFooter({ text: 'Veriler analiz edildi.' });

            const btns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ask_again').setLabel('Yeniden Sor').setStyle(ButtonStyle.Primary).setEmoji('💬'),
                new ButtonBuilder().setCustomId('home_return').setLabel('Ana Sayfa').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
                new ButtonBuilder().setCustomId('del_msg').setLabel('Temizle').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
            );

            await msg.edit({ embeds: [resEmbed], components: [btns] });
        } catch (err) {
            // Hata Durumu (429 vb.)
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('⚠️ Protokol Hatası')
                .setDescription(`**Model:** \`${modelName}\` şu an yanıt vermiyor.\n**Hata:** \`${err.message}\`\n\nLütfen biraz bekleyin veya başka bir çekirdek seçin.`);
            
            const errorBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('home_return').setLabel('Ana Sayfaya Dön').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('del_msg').setLabel('Kapat').setStyle(ButtonStyle.Danger)
            );
            await msg.edit({ embeds: [errorEmbed], components: [errorBtns] });
        }
    }
};

module.exports.help = { name: 'yapayzeka' };
module.exports.conf = { aliases: ['ai', 'omni', 'grave'] };
