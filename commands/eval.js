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

    try {
        // KODU BİRLEŞTİR
        let code = args.join(' ');
        
        // EĞER "await" VARSA ASYNC İFADEYE ÇEVİR
        if (code.includes('await')) {
            code = `(async () => { ${code} })()`;
        }

        // BAŞLANGIÇ ZAMANI
        const startTime = Date.now();
        
        // KODU ÇALIŞTIR
        let evaled = await eval(code);
        
        // BİTİŞ ZAMANI
        const endTime = Date.now();
        const duration = endTime - startTime;

        // ÇIKTIYI FORMATLA
        let output = inspect(evaled, { depth: 0 });
        
        // HASSAS BİLGİLERİ TEMİZLE (TOKEN, API KEY vs.)
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

// HASSAS BİLGİLERİ TEMİZLEME FONKSİYONU
function clean(text) {
    if (typeof text !== 'string') {
        text = inspect(text, { depth: 0 });
    }
    
    // TOKEN'LARI, API KEY'LERİ vs. TEMİZLE
    text = text
        .replace(/token\s*[:=]\s*["'][^"']+["']/gi, 'token: "[REDACTED]"')
        .replace(/["'][A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}["']/g, '"[REDACTED]"')
        .replace(/process\.env\.[A-Z_]+/g, '"[REDACTED]"')
        .replace(/password\s*[:=]\s*["'][^"']+["']/gi, 'password: "[REDACTED]"')
        .replace(/api[_-]?key\s*[:=]\s*["'][^"']+["']/gi, 'api_key: "[REDACTED]"');
    
    return text;
}

module.exports.conf = {
    aliases: ['eval', 'run', 'execute', 'kod'],
    permLevel: 999 // EN YÜKSEK YETKİ
};

module.exports.help = {
    name: 'eval',
    description: 'JavaScript kodu çalıştırır (Sadece Bot Sahibi)',
    usage: 'g!eval <javascript_kodu>',
    category: 'Sahip'
};

// 📌 ÖNEMLİ: BOT_SAHIBI_ID YERİNE KENDİ DISCORD ID'Nİ YAZ!
// Discord ID'ni nasıl bulursun:
// 1. Discord'da Ayarlar → Gelişmiş → Geliştirici Modu'nu aç
// 2. Kendi profilinde sağ tık → ID'yi Kopyala
