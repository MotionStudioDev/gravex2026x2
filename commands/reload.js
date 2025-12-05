const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Bot Sahibinin ID'si (Değişmez)
const SAHIP_ID = "702901632136118273"; 
const COMMANDS_DIR = path.join(__dirname, '../commands/'); // Komutlar klasörünün yolu

/**
 * Node.js'in modül önbelleğini temizleyerek gerçek bir yeniden yükleme sağlar.
 * @param {string} commandName - Yeniden yüklenecek komutun adı (veya hepsi için null).
 * @returns {Array<string>} - Ön bellekten silinen modüllerin yolları.
 */
function uncacheModule(commandName = null) {
    const uncachePaths = [];
    
    // Yüklenen tüm komut dosyalarını bul
    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
        const filePath = path.join(COMMANDS_DIR, file);
        
        // Komut adına göre filtreleme (tek bir komut veya hepsi)
        if (commandName) {
            // Sadece ilgili komut dosyasını bul (dosya adı = komut adı olmalı)
            if (file.replace('.js', '') !== commandName && file.replace('.js', '') !== client.aliases.get(commandName)) {
                continue;
            }
        }

        // Modül ön belleğini temizle
        if (require.cache[filePath]) {
            delete require.cache[filePath];
            uncachePaths.push(filePath);
        }
    }
    return uncachePaths;
}

/**
 * Komutları yeniden yükleme işlemi
 * @param {object} client - Discord Client objesi
 * @param {string} specificCommand - Sadece bu komutu yeniden yükle (isteğe bağlı)
 * @returns {number} - Yüklenen komut sayısı
 */
function loadCommands(client, specificCommand = null) {
    let count = 0;
    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
        const filePath = path.join(COMMANDS_DIR, file);
        const props = require(filePath);

        // Tek komut yükleme filtresi
        if (specificCommand && props.help.name !== specificCommand && !props.conf.aliases.includes(specificCommand)) {
             continue; 
        }

        // Komutları ve takma adları (aliases) kaydet
        client.commands.set(props.help.name, props);
        props.conf.aliases.forEach(alias => {
            client.aliases.set(alias, props.help.name);
        });
        count++;
    }
    return count;
}


module.exports.run = async (client, message, args) => {
    
    // --- YETKİ KONTROLÜ ---
    if (message.author.id !== SAHIP_ID) {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('🚫 Yetkisiz')
                    .setDescription('Bu komutu sadece bot sahibi kullanabilir.')
            ]
        });
    }

    const specificCommand = args[0] ? args[0].toLowerCase() : null;
    const isFullReload = !specificCommand;
    const reloadTarget = isFullReload ? 'TÜM KOMUTLAR' : `\`${specificCommand}\` komutu`;

    // --- ONAY AŞAMASI ---
    const embed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('🔄 Reload Onayı')
        .setDescription(`**${reloadTarget}** yeniden yüklemek üzeresin. Onay veriyorsan **EVET**, iptal için **HAYIR** bas.`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('evet').setLabel('EVET').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('hayir').setLabel('HAYIR').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 15000
    });

    collector.on('collect', async i => {
        if (i.customId === 'evet') {
            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Yellow')
                        .setTitle('🔄 Reload Başlatıldı')
                        .setDescription(`${reloadTarget} için komutlar yeniden başlatılıyor...`)
                ],
                components: []
            });

            try {
                const uncacheCount = uncacheModule(specificCommand); // 1. Önbelleği temizle

                if (isFullReload) {
                    client.commands.clear();
                    client.aliases.clear();
                } else {
                    // Tek komut reload'da sadece ilgili komutları sil
                    const targetCommand = client.commands.get(specificCommand) || client.commands.find(cmd => cmd.conf.aliases.includes(specificCommand));
                    if (targetCommand) {
                        client.commands.delete(targetCommand.help.name);
                        targetCommand.conf.aliases.forEach(alias => client.aliases.delete(alias));
                    }
                }

                const count = loadCommands(client, specificCommand); // 2. Komutları yükle

                if (count === 0 && !isFullReload) {
                     throw new Error(`\`${specificCommand}\` adlı bir komut veya takma ad bulunamadı.`);
                }
                
                // Başarılı Sonuç
                await msg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Green')
                            .setTitle('✅ Reload Başarılı')
                            .setDescription(`**${reloadTarget}** başarıyla yeniden yüklendi.
                            
                            **Yüklenen Komut:** **${count}**
                            **Temizlenen Önbellek:** **${uncacheCount.length}** dosya
                            `)
                    ]
                });
            } catch (err) {
                // Hata Durumu
                await msg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setTitle('❌ Reload Hatası')
                            .setDescription(`\`\`\`js\n${err.message}\n\`\`\``)
                    ]
                });
            }

            collector.stop();
        }

        if (i.customId === 'hayir') {
            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('❌ Reload İptal')
                        .setDescription('Komut yenileme iptal edildi!')
                ],
                components: []
            });
            collector.stop();
        }
    });

    collector.on('end', async () => {
        try {
            // Süre dolunca butonları kaldır
            await msg.edit({ components: [] });
        } catch {}
    });
};

module.exports.conf = {
    aliases: ['reload', 'r']
};

module.exports.help = {
    name: 'reload'
};
