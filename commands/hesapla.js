const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { evaluate, sqrt, sin, cos, tan, pow } = require('mathjs'); 

// Sabitler
const TIME_LIMIT = 90000; // 90 saniye (Daha uzun kullanım süresi)
const MAX_DISPLAY_CHARS = 30; // Gösterilebilecek maksimum karakter sayısı

/**
 * MathJS ile ifadeyi güvenli bir şekilde değerlendirir ve sonucu döndürür.
 * Hata durumunda hata mesajı döner.
 */
function calculate(expression) {
    // MathJS'in anlayacağı formata çevirme (x -> *, ÷ -> /)
    expression = expression.replace(/x/g, '*').replace(/÷/g, '/');
    
    // Pi ve Üs (^) sembollerini MathJS fonksiyonlarına çevirme
    expression = expression.replace(/π/g, 'pi');
    expression = expression.replace(/\^/g, '^'); 

    try {
        let result = evaluate(expression);
        
        if (typeof result === 'number') {
            // Büyük/küçük sayıları veya ondalık hassasiyeti kontrol et
            if (result.toString().length > MAX_DISPLAY_CHARS) {
                // Bilimsel gösterim veya yuvarlama
                result = parseFloat(result.toPrecision(10)); 
            }
        }
        
        return result.toString();
    } catch (error) {
        // SyntaxError veya diğer hatalar için
        return 'Sözdizimi Hatası!';
    }
}

// --------------------------------------------------------------------------------------
// KOMUT İŞLEYİCİ
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {
    
    // Başlangıç Durumu
    let currentInput = '0'; // Sadece son girilen sayıyı/fonksiyonu gösterir
    let fullExpression = ''; // Hesaplama için arka planda tutulan tüm ifade
    let lastResult = null; // En son hesaplanan sonuç
    
    // Hesap Makinesi Tuş Düzeni (5 satırdan 6 satıra çıktı)
    // Yeni tuşlar: DEL, sin, cos, tan, √, ^, π
    const buttonsConfig = [
        ['AC', 'DEL', '(', ')', '÷'],
        ['sin', 'cos', 'tan', '√', '^'], // Yeni Trigonometri/Kök/Üs
        ['7', '8', '9', 'x', 'π'],      // Yeni Pi
        ['4', '5', '6', '-'],
        ['1', '2', '3', '+'],
        ['R', '0', '.', '=']             // R: Last Result (Sonuç)
    ];

    // Butonları oluştur
    const rows = buttonsConfig.map(rowConfig => {
        const row = new ActionRowBuilder();
        rowConfig.forEach(label => {
            let style = ButtonStyle.Secondary;
            let customId = `calc_${label}`;
            
            // Özel stiller
            if (label === '=') style = ButtonStyle.Success;
            else if (['AC', 'DEL'].includes(label)) style = ButtonStyle.Danger;
            else if (['R', 'π', '√', '^', 'sin', 'cos', 'tan'].includes(label)) style = ButtonStyle.Primary; // Fonksiyonlar ve R
            else if (['÷', 'x', '-', '+'].includes(label)) style = ButtonStyle.Primary; 
            
            // Eğer row 4'ten kısaysa (4. ve 5. sıra) buton eklemeden geç
            if (rowConfig.length < 5 && row.components.length >= 4) { 
                // Bu tuşları sadece 4. ve 5. satırlarda 4 butondan sonra eklememek için kontrol
            } else {
                 row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel(label)
                        .setStyle(style)
                );
            }
        });
        return row;
    }).filter(row => row.components.length > 0); // Boş satırları atla (Çoklu satır ekleme sorununu çözmek için)


    // İlk Embed Oluşturma
    const embed = new EmbedBuilder()
        .setColor('Aqua')
        .setTitle('🧠 Ultra Gelişmiş Hesap Makinesi')
        .setDescription(`\`\`\`fix\n${currentInput}\n\`\`\``) // FIX rengi ile daha dikkat çekici
        .setFooter({ text: `Kullanan: ${message.author.tag} | İfade: ${fullExpression.substring(0, MAX_DISPLAY_CHARS)} | Süre: ${TIME_LIMIT / 1000}s` });

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
        
        await i.deferUpdate();

        // --- İŞLEM MANTIKLARI ---

        // Helper: Son karakterin operatör olup olmadığını kontrol et
        const isOperator = (char) => ['÷', 'x', '-', '+', '(', 'sin', 'cos', 'tan', '√', '^'].some(op => fullExpression.endsWith(op));

        if (value === 'AC') {
            // Tamamen temizle
            currentInput = '0';
            fullExpression = '';
            lastResult = null;
        } 
        else if (value === 'DEL') {
            // Geri al/Sil
            if (fullExpression.length > 0) {
                fullExpression = fullExpression.substring(0, fullExpression.length - 1);
                currentInput = fullExpression || '0';
            } else {
                currentInput = '0';
            }
        }
        else if (value === '=') {
            // Hesapla
            if (fullExpression === '') {
                 currentInput = '0';
            } else {
                const result = calculate(fullExpression);
                currentInput = result; // Ekranda sonucu göster
                fullExpression = (result === 'Sözdizimi Hatası!') ? '' : result; // Hata varsa sıfırla, yoksa sonuçla başla
                lastResult = result;
            }
        }
        else if (value === 'R') {
            // Sonucu (Last Result) ifadeye ekle
            if (lastResult && lastResult !== 'Sözdizimi Hatası!') {
                fullExpression += `(${lastResult})`; // Sonucu parantez içinde ekleyerek işlem önceliğini koru
                currentInput = fullExpression;
            } else {
                currentInput = 'Sonuç Yok!';
            }
        }
        else {
            // Sayı, ondalık nokta veya operatör/fonksiyon ekle
            
            let appendValue = value;

            // Fonksiyonları MathJS formatına çevirme
            if (value === '√') appendValue = 'sqrt(';
            else if (value === '^') appendValue = '^';
            else if (['sin', 'cos', 'tan'].includes(value)) appendValue = `${value}(`;
            else if (value === 'π') appendValue = 'pi'; 

            // Eğer ekran sıfırsa veya hata varsa, yeni girişle değiştir
            if (currentInput === '0' || ['Sözdizimi Hatası!', 'Sonuç Yok!'].includes(currentInput) || fullExpression === lastResult) {
                
                // Eğer yeni giriş bir operatör değilse, ekranı sıfırla
                if (!['÷', 'x', '-', '+', ')', '.'].includes(value)) {
                    fullExpression = appendValue;
                } else {
                    fullExpression += appendValue; // Operatörü eklemeye izin ver (örn: '5' çıkan sonuca '+3' eklemek gibi)
                }
                currentInput = fullExpression;

            } else {
                // Normal ekleme
                fullExpression += appendValue;
                currentInput = fullExpression;
            }
        }
        
        // --- Ekran Güncellemesi ---

        // Gösterim alanını temiz ve kısa tut
        let displayForEmbed = fullExpression;
        if (displayForEmbed.length > MAX_DISPLAY_CHARS) {
            displayForEmbed = '...' + displayForEmbed.substring(displayForEmbed.length - MAX_DISPLAY_CHARS);
        }
        
        // Hata durumunda sadece hatayı göster
        if (currentInput === 'Sözdizimi Hatası!' || currentInput === 'Sonuç Yok!') {
             displayForEmbed = currentInput;
             fullExpression = ''; // İfadeyi temizle
        }

        // Yeni Embed oluştur ve güncelle
        const updatedEmbed = new EmbedBuilder(embed)
            .setDescription(`\`\`\`fix\n${currentInput}\n\`\`\``) // Son sonucu/girişi göster
            .setFooter({ text: `Kullanan: ${message.author.tag} | İfade: ${fullExpression.substring(0, MAX_DISPLAY_CHARS)} | Süre: ${TIME_LIMIT / 1000}s` });

        await response.edit({ embeds: [updatedEmbed], components: rows });
    });

    // ... (collector.on('end') kısmı önceki kodla aynı kalabilir) ...

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const finalDisplay = currentInput === 'Sözdizimi Hatası!' ? 'Hata' : currentInput;
            const timeOutEmbed = new EmbedBuilder(embed)
                .setColor('Grey')
                .setTitle('⏳ Hesap Makinesi Kapandı')
                .setDescription(`Süre dolduğu için hesap makinesi kapatıldı. Sonuç: \`${finalDisplay}\``);

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
    aliases: ['hesapla', 'calc', 'calculator', 'hsm'],
    permLevel: 0
};

module.exports.help = {
    name: 'hesapmakinesi',
    description: 'Discord üzerinde interaktif ve gelişmiş bir bilimsel hesap makinesi başlatır.',
    usage: 'g!hesapmakinesi'
};
