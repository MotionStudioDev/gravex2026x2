const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { evaluate } = require('mathjs'); // Gelişmiş matematik işlemleri için mathjs kullanabilirsiniz (npm install mathjs)

// Eğer mathjs kurmak istemiyorsanız, basit eval() kullanabilir veya kendi fonksiyonunuzu yazabilirsiniz.
// NOT: eval() kullanmak güvenlik riskleri taşıyabilir, bu yüzden burada evaluate() kullanacağız.

// Sabitler
const TIME_LIMIT = 60000; // 60 saniye boyunca aktif kalır
const MAX_DIGITS = 15; // Gösterilebilecek maksimum basamak sayısı

/**
 * MathJS ile ifadeyi güvenli bir şekilde değerlendirir ve sonucu döndürür.
 * Hata durumunda hata mesajı döner.
 */
function calculate(expression) {
    // İfadeyi temizleme (çift operatörleri tek yapma, vs.)
    expression = expression.replace(/x/g, '*').replace(/÷/g, '/');

    try {
        let result = evaluate(expression);
        
        // Çok büyük/küçük sayıları veya ondalık hassasiyeti kontrol et
        if (typeof result === 'number') {
             // Çok uzun ondalık sayıları kısaltma
            if (result.toString().length > MAX_DIGITS) {
                result = parseFloat(result.toFixed(8)); // 8 ondalık basamağa yuvarla
            }
        }
        
        return result.toString();
    } catch (error) {
        return 'Hata';
    }
}

// --------------------------------------------------------------------------------------
// KOMUT İŞLEYİCİ
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {
    
    // Başlangıç Durumu
    let display = '0';
    let expression = ''; // Hesaplama için arka planda tutulan ifade
    let lastResult = null; // En son hesaplanan sonuç
    
    // Hesap Makinesi Tuş Düzeni
    const buttonsConfig = [
        ['AC', '(', ')', '÷'],
        ['7', '8', '9', 'x'],
        ['4', '5', '6', '-'],
        ['1', '2', '3', '+'],
        ['0', '.', 'R', '='] // R: Last Result (Sonuç)
    ];

    // Butonları oluştur
    const rows = buttonsConfig.map(rowConfig => {
        const row = new ActionRowBuilder();
        rowConfig.forEach(label => {
            let style = ButtonStyle.Secondary;
            let customId = `calc_${label}`;
            
            // Özel stiller
            if (label === '=') style = ButtonStyle.Success;
            else if (['AC', 'R'].includes(label)) style = ButtonStyle.Danger;
            else if (['÷', 'x', '-', '+'].includes(label)) style = ButtonStyle.Primary;
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(label)
                    .setStyle(style)
            );
        });
        return row;
    });

    const embed = new EmbedBuilder()
        .setColor('Aqua')
        .setTitle('🧮 Grave Hesap Makinesi')
        .setDescription(`\`\`\`\n${display.substring(0, MAX_DIGITS)}\n\`\`\``)
        .setFooter({ text: `Kullanan: ${message.author.tag} | Süre: ${TIME_LIMIT / 1000}s` });

    const response = await message.channel.send({ embeds: [embed], components: rows });

    // Kolektör Filtresi (Sadece komutu başlatan kullanıcı)
    const filter = (i) => i.customId.startsWith('calc_') && i.user.id === message.author.id;
    
    const collector = response.createMessageComponentCollector({ 
        filter, 
        time: TIME_LIMIT, 
        componentType: ComponentType.Button 
    });

    collector.on('collect', async i => {
        const value = i.customId.split('_')[1];
        
        // Kullanıcının butona basma tepkisine hızlı yanıt verme
        await i.deferUpdate();

        // --- İŞLEM MANTIKLARI ---
        
        if (value === 'AC') {
            // Tamamen temizle
            display = '0';
            expression = '';
            lastResult = null;
        } 
        else if (value === '=') {
            // Hesapla
            if (expression === '') {
                 // Eğer sadece '0' varsa, boş hesaplama yapma
                 display = '0';
            } else {
                const result = calculate(expression);
                display = result;
                expression = result === 'Hata' ? '' : result; // Hata varsa ifadeyi de temizle
                lastResult = result;
            }
        }
        else if (value === 'R') {
            // Sonucu (Last Result) ifadeye ekle
            if (lastResult && lastResult !== 'Hata') {
                 // Eğer display '0' ise değiştir, aksi takdirde ekle
                if (display === '0' || ['Hata'].includes(display)) {
                    display = lastResult;
                    expression = lastResult;
                } else {
                    display += lastResult;
                    expression += lastResult;
                }
            } else {
                // R butonu için geçici bir mesaj göster
                display = 'Önce Hesapla!';
            }
        }
        else {
            // Sayı, ondalık nokta veya operatör ekle
            if (display === '0' || ['Hata', 'Önce Hesapla!'].includes(display)) {
                // Eğer ekran sıfırsa veya hata varsa, yeni girişle değiştir
                display = value;
                expression = value;
            } else {
                // Normal ekleme
                display += value;
                expression += value;
            }
        }
        
        // Maksimum basamak kontrolü (Sadece display için)
        if (display.length > MAX_DIGITS && display !== 'Hata' && display !== 'Önce Hesapla!') {
            display = display.substring(0, MAX_DIGITS);
        }
        
        // Yeni Embed oluştur ve güncelle
        const updatedEmbed = new EmbedBuilder(embed)
            .setDescription(`\`\`\`\n${display}\n\`\`\``);

        await response.edit({ embeds: [updatedEmbed], components: rows });
    });

    collector.on('end', async (collected, reason) => {
        // Süre dolduğunda veya sonlandırıldığında butonları devre dışı bırak
        if (reason === 'time') {
            const timeOutEmbed = new EmbedBuilder(embed)
                .setColor('Grey')
                .setTitle('⏳ Hesap Makinesi Kapandı')
                .setDescription(`Süre dolduğu için hesap makinesi kapatıldı. Sonuç: \`${display}\``);

            // Tüm butonları devre dışı bırak
            const disabledRows = rows.map(row => 
                new ActionRowBuilder().addComponents(
                    row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
                )
            );

            await response.edit({ embeds: [timeOutEmbed], components: disabledRows }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ['hesapla', 'calc', 'calculator'],
    permLevel: 0
};

module.exports.help = {
    name: 'hesapmakinesi',
    description: 'Discord üzerinde interaktif bir hesap makinesi başlatır.',
    usage: 'g!hesapmakinesi'
};
