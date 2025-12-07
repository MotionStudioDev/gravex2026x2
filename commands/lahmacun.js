const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require('discord.js');
const path = require('path'); 

module.exports.run = async (client, message, args) => {
    
    // Malzeme Eşleştirme Haritası
    const ingredientMap = {
        'la_limon': '🍋 Limon Sıkıldı',
        'la_domates': '🍅 Domates',
        'la_soğan': '🧅 Soğan',
        'la_maydonoz': '🌿 Maydanoz',
        'la_biber': '🌶️ Biber' // Önceki örneklerden kalan biberi de ekledik.
    };
    
    let selectedIngredients = []; // Seçilen malzemeleri tutar

    // Dosya yolu ve adı.
    // DİKKAT: Bu yolun, botunuzun ana dizininde "assets/lahmacun.png" olarak var olduğundan emin olun.
    const LAHMACUN_IMAGE_PATH = path.join(process.cwd(), 'assets', 'lahmacun.png');
    const LAHMACUN_IMAGE_NAME = 'lahmacun.png'; 

    // --- Fonksiyonlar ---
    
    // Embed Oluşturucu
    const createLahmacunEmbed = (status = 'Siparişiniz Bekleniyor...', color = 'Orange') => {
        const ingredientsText = selectedIngredients.length > 0 ? selectedIngredients.join(', ') : 'Hiçbir şey seçilmedi.';
        
        return new EmbedBuilder()
            .setColor(color)
            .setTitle('🌯 Lahmacun Siparişi')
            .setDescription(`**${message.author.username}**, lahmacununun yanına neleri istersin?`)
            .addFields(
                { name: 'Seçilen Malzemeler:', value: ingredientsText, inline: false },
                { name: 'Durum:', value: `\`${status}\``, inline: false },
                { name: 'Hazırlayan:', value: `${message.author}`, inline: false }
            )
            .setTimestamp()
            // Görseli ekle: Bu, ilk gönderilen dosyaya referans verir.
            .setImage(`attachment://${LAHMACUN_IMAGE_NAME}`); 
    };
    
    // Buton Oluşturucu
    const createButtons = (disabled = false) => {
        const ingredientButtons = Object.keys(ingredientMap).map(id => {
            const label = ingredientMap[id];
            const isSelected = selectedIngredients.includes(label);
            
            return new ButtonBuilder()
                .setCustomId(id)
                .setLabel(label.split(' ')[1]) // Sadece metin kısmını al (Örn: Limon Sıkıldı -> Limon)
                .setStyle(isSelected ? ButtonStyle.Primary : ButtonStyle.Secondary) 
                .setDisabled(disabled);
        });
        
        const controlButtons = [
            new ButtonBuilder()
                .setCustomId('la_siparis_onay')
                .setLabel('✅ Siparişi Ver') // İsteğinize göre güncellendi
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('la_siparis_iptal')
                .setLabel('❌ Siparişi İptal Et') // İsteğinize göre güncellendi
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled)
        ];

        // Butonları satırlara bölme
        const row1 = new ActionRowBuilder().addComponents(ingredientButtons.slice(0, 4));
        const row2 = new ActionRowBuilder().addComponents(ingredientButtons.slice(4)).addComponents(controlButtons);
        
        return [row1, row2];
    };
    
    // --- Komut Çalıştırma ---
    
    // 1. Başlangıç Mesajını Gönder
    // files parametresi SADECE BURADA KULLANILIR.
    const msg = await message.channel.send({ 
        embeds: [createLahmacunEmbed()], 
        components: createButtons(),
        files: [{ attachment: LAHMACUN_IMAGE_PATH, name: LAHMACUN_IMAGE_NAME }] 
    });

    // 2. Buton Dinleyicisini (Collector) Başlat
    const filter = (i) => i.user.id === message.author.id && i.customId.startsWith('la_');
    const collector = msg.createMessageComponentCollector({
        filter,
        time: 60000, 
        componentType: ComponentType.Button
    });

    collector.on('collect', async (interaction) => {
        // Hata önleme için deferUpdate() çağrısı
        await interaction.deferUpdate(); 
        
        const customId = interaction.customId;

        // ------------- Malzeme Seçimi -------------
        if (ingredientMap[customId]) {
            const label = ingredientMap[customId];
            
            if (selectedIngredients.includes(label)) {
                // Çıkar (Toggle)
                selectedIngredients = selectedIngredients.filter(item => item !== label);
            } else {
                // Ekle
                selectedIngredients.push(label);
            }
            
            // Mesajı güncelle (files parametresi YOK - Hata bu yüzden düzeldi)
            await msg.edit({
                embeds: [createLahmacunEmbed()],
                components: createButtons()
            });

        // ------------- Onay/İptal -------------
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
                `Siparişiniz yolda! İçerik: ${content}`,
                'Green'
            ).setTitle('🎉 Lahmacun Siparişi Onaylandı!');

            // İstediğiniz gibi: "Siparişi Ver butonuna tıklayınca o görseli atsın işte"
            // Görsel, Embed içinde referans edildiği için (attachment://lahmacun.png) ve 
            // mesaj düzenlendiği için mesajda kalır.
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
        
        // Final mesajı güncelleme (files parametresi YOK)
        await msg.edit({
            embeds: [finalEmbed],
            components: createButtons(true), // Butonları devre dışı bırak
        }).catch(err => console.error("Final mesajı düzenlenirken hata:", err));
    });
};

module.exports.conf = {
    aliases: ["lahmacun"]
};

module.exports.help = {
    name: 'lahmacun'
};
