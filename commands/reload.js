const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// --- AYARLAR ---
const SAHIP_ID = "702901632136118273";
const LOG_KANAL_ID = "1447918299554910305";
const REBOOT_HISTORY_FILE = path.join(__dirname, '..', 'oriodb', 'reboot_history.json');

// Yardımcı Fonksiyonlar
const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}g ${hours % 24}s ${minutes % 60}d`;
    if (hours > 0) return `${hours}s ${minutes % 60}d ${seconds % 60}sn`;
    if (minutes > 0) return `${minutes}d ${seconds % 60}sn`;
    return `${seconds}sn`;
};

const formatMemory = (bytes) => {
    const mb = (bytes / 1024 / 1024).toFixed(2);
    return `${mb} MB`;
};

const getProgressBar = (percentage, length = 20) => {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${percentage}%`;
};

const getSystemStats = (client) => {
    const memUsage = process.memoryUsage();

    return {
        uptime: formatUptime(client.uptime),
        uptimeMs: client.uptime,
        memoryUsed: formatMemory(memUsage.heapUsed),
        memoryTotal: formatMemory(memUsage.heapTotal),
        memoryPercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1),
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        channels: client.channels.cache.size,
        commands: client.commands ? client.commands.size : 'N/A',
        shardId: client.shard ? client.shard.ids[0] : 'N/A',
        shardCount: client.shard ? client.shard.count : 1,
        nodeVersion: process.version,
        pid: process.pid,
        platform: process.platform
    };
};

const performHealthCheck = async (client) => {
    const memUsage = process.memoryUsage();
    const checks = {
        websocket: client.ws.status === 0,
        guilds: client.guilds.cache.size > 0,
        memory: (memUsage.heapUsed / memUsage.heapTotal) < 0.95,
        uptime: client.uptime > 10000,
        ping: client.ws.ping < 500
    };

    const passed = Object.values(checks).filter(v => v).length;
    const total = Object.keys(checks).length;

    return {
        checks,
        passed,
        total,
        healthy: passed === total,
        score: Math.round((passed / total) * 100)
    };
};

const saveRebootHistory = async (data) => {
    try {
        let history = [];
        try {
            const fileContent = await fs.readFile(REBOOT_HISTORY_FILE, 'utf-8');
            history = JSON.parse(fileContent);
        } catch (e) {
            // Dosya yoksa yeni oluştur
        }

        history.unshift({
            timestamp: new Date().toISOString(),
            ...data
        });

        // Son 50 kaydı tut
        history = history.slice(0, 50);

        await fs.writeFile(REBOOT_HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (error) {
        console.error('[REBOOT HISTORY ERROR]:', error);
    }
};

const getRebootHistory = async () => {
    try {
        const fileContent = await fs.readFile(REBOOT_HISTORY_FILE, 'utf-8');
        const history = JSON.parse(fileContent);
        return history.slice(0, 5); // Son 5 kayıt
    } catch (error) {
        return [];
    }
};

const createCountdownEmbed = (seconds, stats) => {
    const bars = ['▰', '▱'];
    const progress = Math.max(0, ((20 - seconds) / 20) * 100);

    return new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('⏱️ Geri Sayım Başladı')
        .setDescription(
            `\`\`\`ansi\n` +
            `\u001b[1;31m⚠️  ${seconds} SANİYE KALDI  ⚠️\u001b[0m\n` +
            `\u001b[0;37m${getProgressBar(progress)}\u001b[0m\n` +
            `\`\`\``
        )
        .addFields(
            { name: '🎯 Hedef', value: '`Sistem Yeniden Başlatma`', inline: true },
            { name: '⏰ Kalan Süre', value: `\`${seconds}s\``, inline: true },
            { name: '📊 Bellek', value: `\`${stats.memoryPercent}%\``, inline: true }
        )
        .setFooter({ text: 'İptal etmek için butona basın!' })
        .setTimestamp();
};

module.exports.run = async (client, message, args) => {
    // Yetki Kontrolü
    if (message.author.id !== SAHIP_ID) {
        const yetkiYok = new EmbedBuilder()
            .setColor('#ff4747')
            .setTitle('🚫 Erişim Engellendi')
            .setDescription('Bu komut **Çekirdek Sistem** yetkilendirmesi gerektirir.')
            .setFooter({ text: 'Grave Güvenlik Protokolü • Yetkisiz Erişim Denemesi' })
            .setTimestamp();
        return message.reply({ embeds: [yetkiYok], ephemeral: true });
    }

    // Emergency Mode Kontrolü
    const emergencyMode = args.includes('--emergency') || args.includes('-e');

    // Sistem İstatistiklerini Al
    const stats = getSystemStats(client);
    const health = await performHealthCheck(client);
    const history = await getRebootHistory();

    // Sağlık Kontrolü Uyarısı
    let healthWarning = '';
    if (!health.healthy) {
        healthWarning = '\n> [!WARNING]\n> Sistem sağlık kontrolünde bazı sorunlar tespit edildi!\n';
    }

    // Gelişmiş Onay Embed'i
    const onayEmbed = new EmbedBuilder()
        .setColor(emergencyMode ? '#e74c3c' : '#5865f2')
        .setAuthor({
            name: emergencyMode ? '🚨 ACİL DURUM REBOOT PROTOKOLÜ' : 'GRAVE SİSTEM REBOOT PROTOKOLÜ',
            iconURL: client.user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(emergencyMode ? '🚨 Acil Yeniden Başlatma Onayı' : '⚠️ Çekirdek Yeniden Başlatma Onayı')
        .setDescription(
            healthWarning +
            '```ansi\n' +
            `\u001b[1;33m⚡ SİSTEM YENİDEN BAŞLATMA ${emergencyMode ? 'ACİL DURUM ' : ''}UYARISI ⚡\u001b[0m\n` +
            '\u001b[0;37mBu işlem botu tamamen kapatıp yeniden başlatacaktır.\n' +
            'Tüm aktif bağlantılar kesilecek ve .bat döngüsü tetiklenecektir.\u001b[0m\n' +
            '```'
        )
        .addFields(
            {
                name: '📊 Sistem Durumu',
                value: `\`\`\`yml\nÇalışma Süresi: ${stats.uptime}\nBellek: ${stats.memoryUsed} / ${stats.memoryTotal} (${stats.memoryPercent}%)\nSunucular: ${stats.guilds}\nKullanıcılar: ${stats.users}\nNode: ${stats.nodeVersion}\nPlatform: ${stats.platform}\`\`\``,
                inline: false
            },
            {
                name: '🔌 Bağlantı & Performans',
                value: `\`\`\`fix\nWebSocket Ping: ${client.ws.ping}ms\nDurum: ${client.ws.status === 0 ? '🟢 Bağlı' : '🔴 Bağlı Değil'}\nShard: ${stats.shardId}/${stats.shardCount}\nPID: ${stats.pid}\`\`\``,
                inline: true
            },
            {
                name: '🏥 Sağlık Kontrolü',
                value: `\`\`\`diff\n${health.checks.websocket ? '+' : '-'} WebSocket: ${health.checks.websocket ? 'OK' : 'FAIL'}\n${health.checks.guilds ? '+' : '-'} Guilds: ${health.checks.guilds ? 'OK' : 'FAIL'}\n${health.checks.memory ? '+' : '-'} Memory: ${health.checks.memory ? 'OK' : 'FAIL'}\n${health.checks.uptime ? '+' : '-'} Uptime: ${health.checks.uptime ? 'OK' : 'FAIL'}\n${health.checks.ping ? '+' : '-'} Ping: ${health.checks.ping ? 'OK' : 'FAIL'}\n\nSkor: ${health.score}/100\`\`\``,
                inline: true
            }
        );

    // Reboot Geçmişi Ekle
    if (history.length > 0) {
        const historyText = history.map((h, i) => {
            const date = new Date(h.timestamp);
            const timeAgo = formatUptime(Date.now() - date.getTime());
            return `${i + 1}. ${timeAgo} önce - ${h.reason || 'Sebep belirtilmedi'}`;
        }).join('\n');

        onayEmbed.addFields({
            name: '📜 Son Yeniden Başlatmalar',
            value: `\`\`\`\n${historyText}\`\`\``,
            inline: false
        });
    }

    onayEmbed
        .setThumbnail('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJmZzI0ZzRwamZ4ZzRwamZ4ZzRwamZ4ZzRwamZ4ZzRwamZ4ZzRwaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKMGpxfPNHbcV0Y/giphy.gif')
        .setFooter({ text: emergencyMode ? '⚠️ ACİL DURUM MODU - Hemen onaylayın!' : '⏱️ 20 saniye içinde onay bekleniyor...' })
        .setTimestamp();

    const butonlar = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel(emergencyMode ? '🚨 ACİL BAŞLAT' : '⚡ Protokolü Başlat')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚡'),
        new ButtonBuilder()
            .setCustomId('reason')
            .setLabel('📝 Sebep Ekle')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝'),
        new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('❌ İptal Et')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('✖️')
    );

    const anaMesaj = await message.channel.send({ embeds: [onayEmbed], components: [butonlar] });
    const collector = anaMesaj.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 20000
    });

    let rebootReason = args.join(' ').replace('--emergency', '').replace('-e', '').trim() || 'Manuel yeniden başlatma';
    let countdownInterval = null;

    collector.on('collect', async i => {
        if (i.customId === 'cancel') {
            if (countdownInterval) clearInterval(countdownInterval);

            const iptalEmbed = new EmbedBuilder()
                .setColor('#95a5a6')
                .setTitle('❌ İşlem İptal Edildi')
                .setDescription('Yeniden başlatma işlemi kullanıcı tarafından iptal edildi.')
                .addFields(
                    { name: '⏰ İptal Zamanı', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: '👤 İptal Eden', value: `<@${i.user.id}>`, inline: true }
                )
                .setFooter({ text: 'Sistem normal çalışmaya devam ediyor.' })
                .setTimestamp();

            await i.update({ embeds: [iptalEmbed], components: [] });
            return collector.stop();
        }

        if (i.customId === 'reason') {
            const modal = new ModalBuilder()
                .setCustomId('rebootReasonModal')
                .setTitle('Yeniden Başlatma Sebebi');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reasonInput')
                .setLabel('Yeniden başlatma sebebini girin')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Örn: Performans iyileştirmesi, güncelleme, hata düzeltme...')
                .setRequired(false)
                .setMaxLength(500);

            const actionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(actionRow);

            await i.showModal(modal);

            try {
                const modalSubmit = await i.awaitModalSubmit({ time: 60000, filter: m => m.user.id === i.user.id });
                rebootReason = modalSubmit.fields.getTextInputValue('reasonInput') || rebootReason;

                await modalSubmit.reply({
                    content: `✅ Sebep kaydedildi: **${rebootReason}**`,
                    ephemeral: true
                });
            } catch (error) {
                // Modal timeout
            }
            return;
        }

        if (i.customId === 'confirm') {
            await i.deferUpdate();

            // Geri Sayım Başlat
            let countdown = emergencyMode ? 5 : 10;

            const updateCountdown = async () => {
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    await startReboot();
                    return;
                }

                const countdownEmbed = createCountdownEmbed(countdown, stats);

                const cancelButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('cancelCountdown')
                        .setLabel(`❌ İptal Et (${countdown}s)`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⏱️')
                );

                await anaMesaj.edit({ embeds: [countdownEmbed], components: [cancelButton] }).catch(() => { });
                countdown--;
            };

            // İlk güncelleme
            await updateCountdown();

            // Her saniye güncelle
            countdownInterval = setInterval(updateCountdown, 1000);

            // İptal butonu için yeni collector
            const countdownCollector = anaMesaj.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id && i.customId === 'cancelCountdown',
                time: (emergencyMode ? 5 : 10) * 1000
            });

            countdownCollector.on('collect', async cancelInteraction => {
                clearInterval(countdownInterval);

                const iptalEmbed = new EmbedBuilder()
                    .setColor('#e67e22')
                    .setTitle('⏸️ Geri Sayım Durduruldu')
                    .setDescription('Yeniden başlatma geri sayımı son anda iptal edildi!')
                    .setFooter({ text: 'Sistem güvende!' })
                    .setTimestamp();

                await cancelInteraction.update({ embeds: [iptalEmbed], components: [] });
                collector.stop();
            });

            const startReboot = async () => {
                try {
                    // Aşama 1: Sistem Hazırlığı
                    const asamaEmbed1 = new EmbedBuilder()
                        .setColor('#ffaa00')
                        .setTitle('🔄 Yeniden Başlatma Başladı')
                        .setDescription('```ansi\n\u001b[1;33m[1/5]\u001b[0m \u001b[0;36mSistem hazırlanıyor...\u001b[0m\n```')
                        .addFields({ name: '📝 Sebep', value: `\`${rebootReason}\``, inline: false })
                        .setFooter({ text: 'Lütfen bekleyin...' })
                        .setTimestamp();

                    await anaMesaj.edit({ embeds: [asamaEmbed1], components: [] });

                    // Backup oluştur
                    await saveRebootHistory({
                        user: message.author.tag,
                        userId: message.author.id,
                        reason: rebootReason,
                        stats: stats,
                        health: health,
                        emergency: emergencyMode
                    });

                    // Aşama 2: Durum Güncelleme
                    await new Promise(resolve => setTimeout(resolve, 800));
                    const asamaEmbed2 = new EmbedBuilder()
                        .setColor('#ffaa00')
                        .setTitle('🔄 Yeniden Başlatma Devam Ediyor')
                        .setDescription('```ansi\n\u001b[1;32m[1/5]\u001b[0m \u001b[0;32m✓ Sistem hazırlandı\u001b[0m\n\u001b[1;33m[2/5]\u001b[0m \u001b[0;36mDurum güncelleniyor...\u001b[0m\n```')
                        .setFooter({ text: 'Lütfen bekleyin...' })
                        .setTimestamp();

                    await anaMesaj.edit({ embeds: [asamaEmbed2] });

                    // Durum değiştir
                    await client.user.setStatus('idle');
                    await client.user.setActivity('🔄 Yeniden Başlatılıyor...', { type: 3 });

                    // Aşama 3: Bağlantılar Kapatılıyor
                    await new Promise(resolve => setTimeout(resolve, 800));
                    const asamaEmbed3 = new EmbedBuilder()
                        .setColor('#ffaa00')
                        .setTitle('🔄 Yeniden Başlatma Devam Ediyor')
                        .setDescription('```ansi\n\u001b[1;32m[1/5]\u001b[0m \u001b[0;32m✓ Sistem hazırlandı\u001b[0m\n\u001b[1;32m[2/5]\u001b[0m \u001b[0;32m✓ Durum güncellendi\u001b[0m\n\u001b[1;33m[3/5]\u001b[0m \u001b[0;36mBağlantılar kapatılıyor...\u001b[0m\n```')
                        .setFooter({ text: 'Lütfen bekleyin...' })
                        .setTimestamp();

                    await anaMesaj.edit({ embeds: [asamaEmbed3] });

                    // Aşama 4: Log Kaydı
                    await new Promise(resolve => setTimeout(resolve, 800));
                    const asamaEmbed4 = new EmbedBuilder()
                        .setColor('#ffaa00')
                        .setTitle('🔄 Yeniden Başlatma Devam Ediyor')
                        .setDescription('```ansi\n\u001b[1;32m[1/5]\u001b[0m \u001b[0;32m✓ Sistem hazırlandı\u001b[0m\n\u001b[1;32m[2/5]\u001b[0m \u001b[0;32m✓ Durum güncellendi\u001b[0m\n\u001b[1;32m[3/5]\u001b[0m \u001b[0;32m✓ Bağlantılar kapatıldı\u001b[0m\n\u001b[1;33m[4/5]\u001b[0m \u001b[0;36mLog kaydı oluşturuluyor...\u001b[0m\n```')
                        .setFooter({ text: 'Lütfen bekleyin...' })
                        .setTimestamp();

                    await anaMesaj.edit({ embeds: [asamaEmbed4] });

                    // Log Kanalına Detaylı Bildirim
                    const logKanal = client.channels.cache.get(LOG_KANAL_ID);
                    if (logKanal) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(emergencyMode ? '#e74c3c' : '#ff9900')
                            .setAuthor({
                                name: emergencyMode ? '🚨 Sistem Log: ACİL REBOOT' : '🔄 Sistem Log: REBOOT İŞLEMİ',
                                iconURL: message.author.displayAvatarURL({ dynamic: true })
                            })
                            .setDescription(`**Bot yeniden başlatma sürecine girdi.**\n\n📝 **Sebep:** ${rebootReason}`)
                            .addFields(
                                { name: '👤 Yetkili', value: `<@${message.author.id}>`, inline: true },
                                { name: '📍 Kanal', value: `<#${message.channel.id}>`, inline: true },
                                { name: '🟡 Durum', value: '`Idle / Rebooting`', inline: true },
                                { name: '⏱️ Çalışma Süresi', value: `\`${stats.uptime}\``, inline: true },
                                { name: '💾 Bellek', value: `\`${stats.memoryUsed} (${stats.memoryPercent}%)\``, inline: true },
                                { name: '📡 Ping', value: `\`${client.ws.ping}ms\``, inline: true },
                                { name: '🏥 Sağlık Skoru', value: `\`${health.score}/100\``, inline: true },
                                { name: '🚨 Acil Durum', value: emergencyMode ? '`Evet`' : '`Hayır`', inline: true },
                                { name: '🔧 Shard', value: `\`${stats.shardId}/${stats.shardCount}\``, inline: true },
                                { name: '📊 İstatistikler', value: `\`\`\`yml\nSunucular: ${stats.guilds}\nKullanıcılar: ${stats.users}\nKanallar: ${stats.channels}\nKomutlar: ${stats.commands}\nNode: ${stats.nodeVersion}\nPlatform: ${stats.platform}\nPID: ${stats.pid}\`\`\``, inline: false }
                            )
                            .setFooter({ text: 'Sistem otomatik olarak yeniden başlatılacak.' })
                            .setTimestamp();

                        await logKanal.send({ embeds: [logEmbed] });
                    }

                    // Aşama 5: Kapatılıyor
                    await new Promise(resolve => setTimeout(resolve, 800));
                    const asamaEmbed5 = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('✅ Yeniden Başlatma Tamamlanıyor')
                        .setDescription('```ansi\n\u001b[1;32m[1/5]\u001b[0m \u001b[0;32m✓ Sistem hazırlandı\u001b[0m\n\u001b[1;32m[2/5]\u001b[0m \u001b[0;32m✓ Durum güncellendi\u001b[0m\n\u001b[1;32m[3/5]\u001b[0m \u001b[0;32m✓ Bağlantılar kapatıldı\u001b[0m\n\u001b[1;32m[4/5]\u001b[0m \u001b[0;32m✓ Log kaydı oluşturuldu\u001b[0m\n\u001b[1;32m[5/5]\u001b[0m \u001b[0;32m✓ Sistem kapatılıyor...\u001b[0m\n```')
                        .addFields(
                            { name: '📝 Sebep', value: `\`${rebootReason}\``, inline: false },
                            { name: '⏱️ Toplam Süre', value: `\`${((Date.now() - stats.uptimeMs) / 1000).toFixed(1)}s\``, inline: true },
                            { name: '🎯 Mod', value: emergencyMode ? '`🚨 Acil`' : '`⚡ Normal`', inline: true }
                        )
                        .setFooter({ text: 'Bot birkaç saniye içinde tekrar aktif olacak.' })
                        .setTimestamp();

                    await anaMesaj.edit({ embeds: [asamaEmbed5] });

                    // Graceful Shutdown
                    console.log(`\n${'='.repeat(60)}`);
                    console.log(`[REBOOT] Yeniden başlatma ${message.author.tag} tarafından başlatıldı.`);
                    console.log(`[REBOOT] Sebep: ${rebootReason}`);
                    console.log(`[REBOOT] Acil Durum: ${emergencyMode ? 'EVET' : 'Hayır'}`);
                    console.log(`[REBOOT] Çalışma süresi: ${stats.uptime}`);
                    console.log(`[REBOOT] Bellek kullanımı: ${stats.memoryUsed} (${stats.memoryPercent}%)`);
                    console.log(`[REBOOT] Sağlık skoru: ${health.score}/100`);
                    console.log(`[REBOOT] Sistem kapatılıyor...`);
                    console.log(`${'='.repeat(60)}\n`);

                    // .BAT DOSYASINI TETİKLEMEK İÇİN KAPAT
                    setTimeout(() => {
                        process.exit(0);
                    }, 2000);

                } catch (error) {
                    console.error('[REBOOT HATASI]:', error);

                    const hataEmbed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('❌ Yeniden Başlatma Hatası')
                        .setDescription('```diff\n- Yeniden başlatma sırasında bir hata oluştu!\n```')
                        .addFields(
                            { name: '🐛 Hata Detayı', value: `\`\`\`js\n${error.message}\`\`\``, inline: false },
                            { name: '📝 Sebep', value: `\`${rebootReason}\``, inline: false }
                        )
                        .setFooter({ text: 'Lütfen tekrar deneyin veya manuel olarak yeniden başlatın.' })
                        .setTimestamp();

                    await anaMesaj.edit({ embeds: [hataEmbed], components: [] });
                }
            };
        }
    });

    // Timeout Handler
    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            if (countdownInterval) clearInterval(countdownInterval);

            const timeoutEmbed = new EmbedBuilder()
                .setColor('#95a5a6')
                .setTitle('⏱️ Süre Doldu')
                .setDescription('Yeniden başlatma onayı için süre doldu. İşlem otomatik olarak iptal edildi.')
                .addFields(
                    { name: '⏰ Timeout Zamanı', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: '🔄 Tekrar Dene', value: 'Komutu yeniden çalıştırın', inline: true }
                )
                .setFooter({ text: 'Güvenlik protokolü devrede.' })
                .setTimestamp();

            anaMesaj.edit({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
        }
    });
};

module.exports.conf = {
    aliases: ['reboot', 'yenidenbaslat', 'restart', 'rs', 'r']
};

module.exports.help = {
    name: 'reload',
    description: 'Botu güvenli bir şekilde yeniden başlatır. Gelişmiş özellikler: geri sayım, sağlık kontrolü, geçmiş takibi.',
    usage: 'reload [--emergency/-e] [sebep]',
    category: 'Sistem',
    examples: [
        'reload',
        'reload Performans iyileştirmesi',
        'reload --emergency Kritik hata düzeltme'
    ]
};
