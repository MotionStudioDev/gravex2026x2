const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const { OpenAI } = require('openai');

// API İstemcileri
const xiaomiClient = new OpenAI({ baseURL: "https://api.xiaomimimo.com/v1", apiKey: "sk-s4qnnx4bry5839nid72niqle9naflk29y7r23103ktswtosj" });
const neuroaClient = new OpenAI({ baseURL: "https://api.neuroa.me/v1", apiKey: "sk-neuroa-f59c1b90fb4ffb64bd230dbabec83360" });
const openRouterClient = new OpenAI({ 
    baseURL: "https://openrouter.ai/api/v1", 
    apiKey: "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" 
});

module.exports.run = async (client, message, args) => {
    let currentPrompt = args.join(' ');
    if (!currentPrompt) return message.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ **Hata:** Lütfen yapay zekaya bir talimat verin!')] });

    let lastSelectedModel = null;

    const createMainMenu = (prompt) => {
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ name: 'GRAVE YAPAY ZEKA • ULTRA v13.0', iconURL: client.user.displayAvatarURL() })
            .setTitle('GraveAI Çok Fonksiyonlu Asistan')
            .setDescription(`**Mevcut Odak Noktası:**\n\`\`\`text\n${prompt}\`\`\`\n**Yürütmek istediğiniz çekirdek protokolünü seçin:**`)
            .addFields(
                { name: '🌐 Ağ Durumu', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: '🛠️ Modül', value: '`Hazır`', inline: true }
            )
            .setFooter({ text: 'Tüm işlemler şifreli protokol üzerinden yürütülür.' });

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ai_select')
                .setPlaceholder('Bir İşlem Çekirdeği Seçiniz...')
                .addOptions([
                    { label: 'NVDIA NEMOTRON', value: 'model_nvidia', description: 'Gelişmiş mantık ve metin analizi.', emoji: '1455930910300967074' },
                    { label: 'GPT-3.5 Turbo', value: 'model_neuroa', description: 'Neuroa hızlı sohbet motoru.', emoji: '1456056261345935575' },
                    { label: 'GraveAI v1 (Görsel)', value: 'model_image', description: 'DALL-E 3 tabanlı görsel üretim.', emoji: '1456225136763080744' },
                    { label: 'Xiaomi Mimo', value: 'model_xiaomi', description: 'Hızlı ve alternatif analiz çekirdeği.', emoji: '1455930635930570812' }
                ])
        );
        return { embeds: [embed], components: [menu] };
    };

    let msg = await message.channel.send(createMainMenu(currentPrompt));
    const collector = msg.createMessageComponentCollector({ time: 600000 });

    collector.on('collect', async (i) => {
        if (i.user.id !== message.author.id) return i.reply({ content: 'Bu oturum size ait değil.', ephemeral: true });

        if (i.isStringSelectMenu()) {
            await i.deferUpdate();
            lastSelectedModel = i.values[0];
            await handleAIRequest(lastSelectedModel, currentPrompt);
        }

        if (i.isButton()) {
            if (i.customId === 'del_msg') return msg.delete().catch(() => {});
            if (i.customId === 'home_return') {
                await i.deferUpdate();
                return msg.edit(createMainMenu(currentPrompt));
            }
            if (i.customId === 'ask_again') {
                const modal = new ModalBuilder().setCustomId('ask_modal').setTitle('GraveAI • Yeniden Formüle Et');
                const questionInput = new TextInputBuilder()
                    .setCustomId('new_question').setLabel(`Yeni Talimatınızı Girin`).setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder('Örn: Cyberpunk bir kedi çiz...');
                modal.addComponents(new ActionRowBuilder().addComponents(questionInput));
                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
                if (submitted) {
                    await submitted.deferUpdate();
                    currentPrompt = submitted.fields.getTextInputValue('new_question');
                    await handleAIRequest(lastSelectedModel, currentPrompt);
                }
            }
        }
    });

    async function handleAIRequest(selected, prompt, isRetry = false) {
        const start = Date.now();
        let color = 'Yellow';
        let modelDisplay = selected.replace('model_', '').toUpperCase();

        if (selected === 'model_nvidia') color = '#76B900';
        if (selected === 'model_neuroa') color = '#00A67E';
        if (selected === 'model_image') { color = '#9B59B6'; modelDisplay = "GRAVE IMAGE v1"; }

        await msg.edit({ 
            embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:yukle:1440677432976867448> **${modelDisplay}** çekirdeği veri bloklarını işliyor...`)], 
            components: [] 
        });

        try {
            let result;
            let isImage = false;

            if (selected === 'model_image') {
                const imageResponse = await neuroaClient.images.generate({
                    model: "dall-e-3",
                    prompt: prompt,
                    n: 1,
                    size: "1024x1024",
                });
                result = imageResponse.data[0].url;
                isImage = true;
            } else {
                let completion;
                let apiParams = { messages: [{ role: "system", content: "Sen Grave asistanısın. Profesyonel, yardımcı ve teknik bir dil kullan. Türkçe yanıt ver." }, { role: "user", content: prompt }] };
                
                if (isRetry) {
                    completion = await xiaomiClient.chat.completions.create({ model: "mimo-v2-flash", ...apiParams });
                } else {
                    switch (selected) {
                        case 'model_nvidia': 
                            completion = await openRouterClient.chat.completions.create({ model: "nvidia/nemotron-3-nano-30b-a3b:free", ...apiParams }); 
                            break;
                        case 'model_neuroa': 
                            completion = await neuroaClient.chat.completions.create({ model: "gpt-3.5-turbo", ...apiParams }); 
                            break;
                        case 'model_xiaomi': 
                            completion = await xiaomiClient.chat.completions.create({ model: "mimo-v2-flash", ...apiParams }); 
                            break;
                    }
                }
                result = completion.choices[0].message.content;
            }

            const duration = ((Date.now() - start) / 1000).toFixed(2);
            const resEmbed = new EmbedBuilder()
                .setColor(isImage ? '#9B59B6' : '#2ECC71')
                .setAuthor({ name: `GraveAI • ${modelDisplay}`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            if (isImage) {
                resEmbed.setDescription(` ✅ **Görsel Analizi Tamamlandı**\n**Talimat:** \`${prompt}\``)
                        .setImage(result)
                        .setFooter({ text: `İşlem Süresi: ${duration}s | Grave Arşiv Sistemi Aktif` });
            } else {
                resEmbed.setDescription(result.length > 4000 ? result.substring(0, 3990) + "..." : result)
                        .addFields(
                            { name: '⏱️ Süre', value: `\`${duration}s\``, inline: true },
                            { name: '📊 Çıktı', value: `\`${result.length} Karakter\``, inline: true },
                            { name: '🧪 Durum', value: isRetry ? '`Kurtarma Modu`' : '`Stabil`', inline: true }
                        );
            }

            const btns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ask_again').setLabel('Yeniden Sor').setStyle(ButtonStyle.Primary).setEmoji('💬'),
                new ButtonBuilder().setCustomId('home_return').setLabel('Ana Menü').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
                new ButtonBuilder().setCustomId('del_msg').setLabel('Oturumu Kapat').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
            );

            await msg.edit({ embeds: [resEmbed], components: [btns] });

        } catch (err) {
            console.error(err);
            if (!isRetry && selected !== 'model_image') return handleAIRequest(selected, prompt, true);
            
            const errEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('⚠️ Kritik Çekirdek Hatası')
                .setDescription(`**Sistem Raporu:** \`${err.message}\``)
                .addFields({ name: '🛠️ Olası Çözüm', value: 'API limiti dolmuş olabilir veya sunucu yanıt vermiyor. Lütfen farklı bir çekirdek deneyin.' });

            await msg.edit({ 
                embeds: [errEmbed], 
                components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('home_return').setLabel('Geri Dön').setStyle(ButtonStyle.Secondary))] 
            });
        }
    }
};

module.exports.help = { name: 'yapayzeka' };
module.exports.conf = { aliases: ['ai', 'omni', 'grave'] };
