const { EmbedBuilder, codeBlock } = require('discord.js');
const { inspect } = require('util');

module.exports.run = async (client, message, args) => {
    // SADECE BOT SAHİBİ KULLANABİLSİN
    if (message.author.id !== '702901632136118273') { // BURAYA KENDİ DISCORD ID'Nİ YAZ
        return message.reply('❌ Bu komutu sadece bot sahibi kullanabilir!');
    }

    // KOD YOKSA HATA
    if (!args[0]) {
        return message.reply('⚠️ Lütfen çalıştırmak istediğin kodu yaz!\nÖrnek: `g!eval message.channel.send("Merhaba")`');
    }

    // TOKEN GÖSTERMEYİ ENGELLEYEN KONTROL
    const forbiddenPatterns = [
        'client.token',
        'client.options.token',
        'process.env',
        '.env',
        'TOKEN',
        'token'
    ];
    
    const userCode = args.join(' ');
    
    // EĞER TOKEN İLE İLGİLİ BİR KOD VARSA BLOKLA
    if (forbiddenPatterns.some(pattern => 
        userCode.toLowerCase().includes(pattern.toLowerCase())
    )) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚫 GÜVENLİK ENGELLEDİ')
                    .setDescription('Token veya hassas bilgi içeren kodlar çalıştırılamaz!')
                    .addFields(
                        { name: 'Engellenen Kalıp', value: codeBlock('js', userCode), inline: false }
                    )
                    .setFooter({ text: 'Güvenlik Politikası' })
            ]
        });
    }

    try {
        // KODU BİRLEŞTİR
        let code = args.join(' ');
        
        // EĞER "await" VARSA ASYNC İFADEYE ÇEVİR
        if (code.includes('await') && !code.includes('async')) {
            code = `(async () => { ${code} })()`;
        }

        // BAŞLANGIÇ ZAMANI
        const startTime = Date.now();
        
        // KODU ÇALIŞTIR (withTimeout ile)
        let evaled = await withTimeout(code, 5000); // 5 saniye timeout
        
        // BİTİŞ ZAMANI
        const endTime = Date.now();
        const duration = endTime - startTime;

        // ÇIKTIYI FORMATLA
        let output = inspect(evaled, { depth: 1 });
        
        // HASSAS BİLGİLERİ TEMİZLE
        output = clean(output);

        // ÇIKTI ÇOK UZUNSA KISALT
        if (output.length > 1000) {
            output = output.substring(0, 1000) + '... (çıktı kısaltıldı)';
        }

        // EMBED OLUŞTUR
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ **EVAL BAŞARILI**')
            .addFields(
                { 
                    name: '⏱️ **Süre**', 
                    value: `\`${duration}ms\``, 
                    inline: true 
                },
                { 
                    name: '📥 **Girdi**', 
                    value: codeBlock('js', args.join(' ').substring(0, 500)), 
                    inline: false 
                },
                { 
                    name: '📤 **Çıktı**', 
                    value: codeBlock('js', output), 
                    inline: false 
                }
            )
            .setFooter({ text: `Komutu kullanan: ${message.author.tag}` })
            .setTimestamp();

        // MESAJI GÖNDER
        await message.reply({ embeds: [embed] });

    } catch (error) {
        // HATA DURUMUNDA
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ **EVAL HATASI**')
            .addFields(
                { 
                    name: '📥 **Girdi**', 
                    value: codeBlock('js', args.join(' ').substring(0, 500)), 
                    inline: false 
                },
                { 
                    name: '⚠️ **Hata**', 
                    value: codeBlock('js', error.toString()), 
                    inline: false 
                }
            )
            .setFooter({ text: `Komutu kullanan: ${message.author.tag}` })
            .setTimestamp();

        await message.reply({ embeds: [errorEmbed] });
    }
};

// TIMEOUT İLE KOD ÇALIŞTIRMA
function withTimeout(code, timeout) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Kod çalıştırma süresi aşıldı (5 saniye)'));
        }, timeout);
        
        try {
            const result = eval(code);
            
            if (result && typeof result.then === 'function') {
                result.then(value => {
                    clearTimeout(timer);
                    resolve(value);
                }).catch(err => {
                    clearTimeout(timer);
                    reject(err);
                });
            } else {
                clearTimeout(timer);
                resolve(result);
            }
        } catch (error) {
            clearTimeout(timer);
            reject(error);
        }
    });
}

// HASSAS BİLGİLERİ TEMİZLEME FONKSİYONU
function clean(text) {
    if (typeof text !== 'string') {
        text = inspect(text, { depth: 1 });
    }
    
    // TÜM TOKEN VE HASSAS BİLGİLERİ TEMİZLE
    const patterns = [
        // Discord Tokenleri
        /[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/g,
        /mfa\.[A-Za-z0-9_-]{84}/g,
        
        // client.token ve türevleri
        /client\.token/g,
        /client\.options\.token/g,
        /bot\.token/g,
        
        // process.env değişkenleri
        /process\.env\.[A-Z_]+/g,
        
        // Şifreler ve API key'leri
        /password\s*[:=]\s*["'][^"']+["']/gi,
        /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi,
        /secret\s*[:=]\s*["'][^"']+["']/gi,
        /auth\s*[:=]\s*["'][^"']+["']/gi,
        /access[_-]?token\s*[:=]\s*["'][^"']+["']/gi,
        
        // Database bağlantıları
        /mongodb(\+srv)?:\/\/[^"\s]+/gi,
        /mysql:\/\/[^"\s]+/gi,
        /postgresql:\/\/[^"\s]+/gi,
        /DATABASE_URL=["'][^"']+["']/gi,
        
        // Uzun base64 string'ler
        /["']([A-Za-z0-9+/]{40,})["']/g,
    ];
    
    patterns.forEach(pattern => {
        text = text.replace(pattern, '[REDACTED]');
    });
    
    // Client objesindeki token'ları temizle
    if (text.includes('Client')) {
        text = text.replace(/token: '[^']+'/, "token: '[REDACTED]'")
                   .replace(/token: "[^"]+"/, 'token: "[REDACTED]"')
                   .replace(/token: `[^`]+`/, 'token: `[REDACTED]`')
                   .replace(/["'][A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}["']/g, '"[REDACTED]"');
    }
    
    return text;
}

module.exports.conf = {
    aliases: ['eval', 'run', 'execute', 'kod'],
    permLevel: 999
};

module.exports.help = {
    name: 'eval',
    description: 'JavaScript kodu çalıştırır (Sadece Bot Sahibi)',
    usage: 'g!eval <javascript_kodu>',
    category: 'Sahip'
};
