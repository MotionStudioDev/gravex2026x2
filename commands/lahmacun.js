const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField,
    ComponentType 
} = require('discord.js');
const path = require('path'); // Görsel yolu için path modülünü ekledik

module.exports.run = async (client, message, args) => {
    
    // Malzeme Eşleştirme ve Durum Takibi için Map
    const ingredientMap = {
        'la_limon': '🍋 Limon Sıkıldı',
        'la_domates': '🍅 Domates',
        'la_soğan': '🧅 Soğan',
        'la_maydonoz': '🌿 Maydanoz',
        'la_biber': '🌶️ Biber'
    };
    
    let selectedIngredients = []; // Seçilen malzemeleri tutacak dizi

    // Görsel yolu (Eğer dosyanız botun ana dizininde "assets" klasöründeyse bu yolu kullanın)
    const LAHMACUN_IMAGE_PATH = path.join(process.cwd(), 'assets', 'lahmacun.png');
    const LAHMACUN_IMAGE_NAME = 'lahmacun.png'; // Discord'a gönderilecek dosya adı

    // Fonksiyon: Embed'i güncellemek için
    const createLahmacunEmbed = (status = 'Siparişiniz Bekleniyor...', color = 'Orange') => {
        const ingredientsText = selectedIngredients.length > 0 ? selectedIngredients.join(', ') : 'Hiçbir şey seçilmedi.';
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🌯 Lahmacun Siparişi')
            .setDescription(`**${message.author.username}**, lahmacununun yanına neleri istersin?`)
            .addFields(
                { name: 'Seçilen Malzemeler:', value: ingredientsText, inline: false },
                { name: 'Durum:', value: `\`${status}\``, inline: false },
                { name: 'Hazırlayan:', value: `${message.author}`, inline: false }
            )
            .setTimestamp()
            // Görseli ekle: attachment'ın URL'si olarak ayarla
            .setImage(`attachment://${LAHMACUN_IMAGE_NAME}`); 

        return embed;
    };
    
    // Fonksiyon: Butonları oluşturmak için (Önceki kodunuzla aynı)
    const createButtons = (disabled = false) => {
        const buttons = Object.keys(ingredientMap).map(id => {
            const label = ingredientMap[id];
            const isSelected = selectedIngredients.includes(label);
            
            return new ButtonBuilder()
                .setCustomId(id)
                .setLabel(label.split(' ')[1]) 
                .setStyle(isSelected ? ButtonStyle.Primary : ButtonStyle.Secondary) 
                .setDisabled(disabled);
        });
        
        const controlButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('la_siparis_onay')
                .setLabel('✅ Siparişi Onayla')
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('la_siparis_iptal')
                .setLabel('❌ İptal Et')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled)
        );

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 4));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(4)).addComponents(controlButtons.components);
        
        return [row1, row2];
    };
    
    // 1. Başlangıç Mesajını Gönder
    const msg = await message.channel.send({ 
        embeds: [createLahmacunEmbed()], 
        components: createButtons(),
        files: [{ attachment: LAHMACUN_IMAGE_PATH, name: LAHMACUN_IMAGE_NAME }] // Görseli dosya olarak gönder
    });

    // 2. Buton Dinleyicisini (Collector) Başlat (Kalan mantık aynı)
    const filter = (i) => i.user.id === message.author.id && i.customId.startsWith('la_');
    const collector = msg.createMessageComponentCollector({
        filter,
        time: 60000, 
        componentType: ComponentType.Button
    });

    collector.on('collect', async (interaction) => {
        await interaction.deferUpdate(); 
        
        const customId = interaction.customId;

        // Malzeme Seçimi Mantığı
        if (ingredientMap[customId]) {
            const label = ingredientMap[customId];
            
            if (selectedIngredients.includes(label)) {
                selectedIngredients = selectedIngredients.filter(item => item !== label);
            } else {
                selectedIngredients.push(label);
            }
            
            // Mesajı güncelle
            await msg.edit({
                embeds: [createLahmacunEmbed()],
                components: createButtons()
            });

        // Onay/İptal Mantığı
        } else if (customId === 'la_siparis_onay') {
            collector.stop('onaylandı');
            
        } else if (customId === 'la_siparis_iptal') {
            collector.stop('iptal edildi');
        }
    });

    // 3. Collector Bittiğinde İşlem Yap
    collector.on('end', async (collected, reason) => {
        let finalEmbed;

        if (reason === 'onaylandı') {
            const content = selectedIngredients.length > 0 ? selectedIngredients.join(', ') : 'Sade (Hiçbir şey)';
            
            finalEmbed = createLahmacunEmbed(
                `Siparişiniz onaylandı! İçerik: ${content}`,
                'Green'
            ).setTitle('🎉 Lahmacun Siparişi Onaylandı!');

        } else if (reason === 'iptal edildi') {
            finalEmbed = createLahmacunEmbed(
                'Sipariş kullanıcı tarafından iptal edildi.',
                'Red'
            ).setTitle('❌ Lahmacun Siparişi İptal Edildi');

        } else if (reason === 'time') {
            finalEmbed = createLahmacunEmbed(
                'Süre doldu, sipariş otomatik olarak iptal edildi.',
                'Red'
            ).setTitle('⌛ Süre Doldu');
        }
        
        // Final mesajında da görseli göndermeye devam etmeliyiz
        await msg.edit({
            embeds: [finalEmbed],
            components: createButtons(true), // Butonları devre dışı bırak
            files: [{ attachment: LAHMACUN_IMAGE_PATH, name: LAHMACUN_IMAGE_NAME }]
        }).catch(err => console.error("Final mesajı düzenlenirken hata:", err));
    });
};

module.exports.conf = {
    aliases: ["lahmacun"]
};

module.exports.help = {
    name: 'lahmacun'
};
