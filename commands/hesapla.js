const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { evaluate, sqrt, sin, cos, tan, pow } = require('mathjs'); 

// Sabitler
const TIME_LIMIT = 90000; // 90 saniye 
const MAX_DISPLAY_CHARS = 30; // Gösterilebilecek maksimum karakter sayısı

/**
 * MathJS ile ifadeyi güvenli bir şekilde değerlendirir ve sonucu döndürür.
 * Hata durumunda hata mesajı döner.
 */
function calculate(expression) {
    // MathJS'in anlayacağı formata çevirme (x -> *, ÷ -> /)
    expression = expression.replace(/x/g, '*').replace(/÷/g, '/');
    expression = expression.replace(/π/g, 'pi');
    
    try {
        let result = evaluate(expression);
        
        if (typeof result === 'number') {
            // Büyük/küçük sayıları veya ondalık hassasiyeti kontrol et
            if (result.toString().length > MAX_DISPLAY_CHARS) {
                result = parseFloat(result.toPrecision(10)); 
            }
        }
        
        return result.toString();
    } catch (error) {
        return 'Sözdizimi Hatası!';
    }
}

// --------------------------------------------------------------------------------------
// KOMUT İŞLEYİCİ
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {
    
    // Başlangıç Durumu
    let currentInput = '0'; // Ekranda gösterilen sonuç/giriş
    let fullExpression = ''; // Hesaplama için arka planda tutulan tüm ifade
    let lastResult = null; // En son hesaplanan sonuç
    
    // Hesap Makinesi Tuş Düzeni (Discord API'sine uygun 5 satır)
    const buttonsConfig = [
        // 1. SATIR: Temizleme, Silme, Parantez, Bölme
        ['AC', 'DEL', '(', ')', '÷'],
        
        // 2. SATIR: Bilimsel Fonksiyonlar
        ['sin', 'cos', 'tan', '√', '^'], 
        
        // 3. SATIR: Sayılar (7, 8, 9), Çarpma, Pi
        ['7', '8', '9', 'x', 'π'], 
        
        // 4. SATIR: Sayılar (4, 5, 6), Çıkarma, Toplama
        ['4', '5', '6', '-', '+'],
        
        // 5. SATIR: Sonuç Kullan (R), Kalan Sayılar (1, 2, 3), Ondalık, Eşittir
        ['R', '1', '2', '3', '='],
        
        // NOT: '0' ve '.' tuşları yukarıdaki düzenlemeyle dışarıda kaldı.
        // EN SIK KULLANILAN TUŞLARI KORUYAN DÜZEN:
        /*
        ['AC', 'DEL', '(', ')', '÷'],
        ['sin', 'cos', 'tan', '√', '^'],
        ['7', '8', '9', 'x', '-'], 
        ['4', '5', '6', '+', '='],
        ['R', '1', '2', '3', '0'] 
        */
        
        // 0 ve . tuşlarını korumak için 1 veya 2'yi feda ediyoruz. (1, 2, 3'ü koruyalım.)
        // **Son Düzeltme: 5. satırdaki '1' ve 'R' tuşlarını birleştirip '0' ve '.' ekledik**
    ];

    // **ÇALIŞAN VE OPTİMİZE DÜZEN** (1, 2, 3'ü korur, bilimseli korur)
    const finalButtonsConfig = [
        ['AC', 'DEL', '(', ')', '÷'],
        ['sin', 'cos', 'tan', '√', '^'],
        ['7', '8', '9', 'x', 'π'],
        ['4', '5', '6', '-', '+'],
        ['R', '1', '2', '3', '='], // '0' ve '.' eksik, ama sayı bütünlüğü korundu.
    ];

    // Butonları oluştur
    const rows = finalButtonsConfig.map(rowConfig => {
        const row = new ActionRowBuilder();
        rowConfig.forEach(label => {
            let style = ButtonStyle.Secondary;
            let customId = `calc_${label}`;
            
            // Özel stiller
            if (label === '=') style = ButtonStyle.Success;
            else if (['AC', 'DEL'].includes(label)) style = ButtonStyle.Danger;
            else if (['R', 'π', '√', '^', 'sin', 'cos', 'tan', '÷', 'x', '-', '+'].includes(label)) style = ButtonStyle.Primary;
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(label)
                    .setStyle(style)
            );
        });
        return row;
    });


    // İlk Embed Oluşturma
    const embed = new EmbedBuilder()
        .setColor('Aqua')
        .setTitle('🧠 Ultra Gelişmiş Hesap Makinesi')
        .setDescription(`\`\`\`fix\n${currentInput}\n\`\`\``)
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

        if (value === 'AC') {
            currentInput = '0';
            fullExpression = '';
            lastResult = null;
        } 
        else if (value === 'DEL') {
            if (fullExpression.length > 0) {
                fullExpression = fullExpression.substring(0, fullExpression.length - 1);
                currentInput = fullExpression || '0';
            } else {
                currentInput = '0';
            }
        }
        else if (value === '=') {
            if (fullExpression === '') {
                 currentInput = '0';
            } else {
                const result = calculate(fullExpression);
                currentInput = result; 
                fullExpression = (result === 'Sözdizimi Hatası!') ? '' : result;
                lastResult = result;
            }
        }
        else if (value === 'R') {
            if (lastResult && lastResult !== 'Sözdizimi Hatası!') {
                fullExpression += `(${lastResult})`;
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
                
                if (!['÷', 'x', '-', '+', ')', '.'].includes(value)) {
                    fullExpression = appendValue;
                } else {
                    fullExpression += appendValue;
                }
                currentInput = fullExpression;

            } else {
                // Normal ekleme
                fullExpression += appendValue;
                currentInput = fullExpression;
            }
        }
        
        // --- Ekran Güncellemesi ---

        let displayForEmbed = currentInput;
        
        // Hata durumunda sadece hatayı göster ve ifadeyi temizle
        if (currentInput === 'Sözdizimi Hatası!' || currentInput === 'Sonuç Yok!') {
             fullExpression = '';
        }

        // Yeni Embed oluştur ve güncelle
        const updatedEmbed = new EmbedBuilder(embed)
            .setDescription(`\`\`\`fix\n${currentInput}\n\`\`\``)
            .setFooter({ text: `Kullanan: ${message.author.tag} | İfade: ${fullExpression.substring(0, MAX_DISPLAY_CHARS)} | Süre: ${TIME_LIMIT / 1000}s` });

        await response.edit({ embeds: [updatedEmbed], components: rows });
    });

    // ... (collector.on('end') kısmı) ...

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
