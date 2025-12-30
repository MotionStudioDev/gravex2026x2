const { EmbedBuilder, ActionRowBuilder, PermissionsBitField, StringSelectMenuBuilder, AttachmentBuilder } = require("discord.js");
const AdmZip = require("adm-zip"); // npm install adm-zip

module.exports.run = async (client, message, args) => {
    // 1. YETKİ KONTROLÜ
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const noAuth = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("❌ Yetki Reddedildi")
            .setDescription("Bu düzeyde bir temizlik protokolü yürütmek için `Mesajları Yönet` yetkisine sahip olmalısınız.");
        return message.reply({ embeds: [noAuth] });
    }

    const miktar = parseInt(args[0]);
    if (!miktar || isNaN(miktar) || miktar < 1 || miktar > 100) {
        const usageEmbed = new EmbedBuilder()
            .setColor("Orange")
            .setTitle("⚠️ Eksik Veri Girişi")
            .setDescription("Lütfen temizlenecek mesaj miktarını belirtin (**1-100**).\n\n**Örnek kullanım:**\n`g!sil 50` veya `g!sil 100 @kullanıcı`")
            .setFooter({ text: "Grave Moderasyon Sistemi" });
        return message.reply({ embeds: [usageEmbed] });
    }

    // 2. KANAL ANALİZİ VE ÖN HAZIRLIK
    const fetched = await message.channel.messages.fetch({ limit: 100 });
    const stats = {
        total: fetched.size,
        bots: fetched.filter(m => m.author.bot).size,
        links: fetched.filter(m => /https?:\/\/[^\s]+/.test(m.content)).size,
        media: fetched.filter(m => m.attachments.size > 0 || m.embeds.length > 0).size
    };

    const analysisEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Grave Operasyonel Temizlik & Arşiv Paneli', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(message.guild.iconURL())
        .setDescription(`Kanal verileri analiz edildi. Hedef: **${miktar} Mesaj**\n\n**Yeni:** Artık "Yedekle ve Temizle" seçeneğiyle mesajları ZIP olarak arşivleyebilirsiniz!`)
        .addFields(
            { name: '🤖 Botlar', value: `\`${stats.bots} Mesaj\``, inline: true },
            { name: '🔗 Linkler', value: `\`${stats.links} Mesaj\``, inline: true },
            { name: '🖼️ Medya', value: `\`${stats.media} Mesaj\``, inline: true }
        )
        .setFooter({ text: 'Seçim yapmanız için 30 saniyeniz var.' });

    const menuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('op_menu')
            .setPlaceholder('Temizlik/Yedekleme Protokolünü Seçin')
            .addOptions([
                { 
                    label: 'Yedekle ve Temizle', 
                    description: 'Mesajları ZIP yapıp DM gönderir ve kanalı temizler.', 
                    value: 'backup_clear', 
                    emoji: '📦' 
                },
                { 
                    label: `Normal Temizlik (${miktar})`, 
                    description: 'Filtreleme yapmadan belirlenen sayı kadar mesajı siler.', 
                    value: 'all', 
                    emoji: '🧹' 
                },
                { 
                    label: 'Sadece Kullanıcı Filtresi', 
                    description: 'Etiketlenen kullanıcının mesajlarını hedefler.', 
                    value: 'user', 
                    emoji: '👤' 
                },
                { 
                    label: 'Sadece Bot Protokolü', 
                    description: 'Sistem ve bot mesajlarını temizler.', 
                    value: 'bots', 
                    emoji: '🤖' 
                },
                { 
                    label: 'Siber Temizlik (Link)', 
                    description: 'Sadece URL/Link içeren mesajları siler.', 
                    value: 'links', 
                    emoji: '🔗' 
                }
            ])
    );

    const mainMsg = await message.channel.send({ embeds: [analysisEmbed], components: [menuRow] });

    const collector = mainMsg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 30000
    });

    collector.on('collect', async i => {
        if (i.isStringSelectMenu()) {
            const mode = i.values[0];
            
            const procEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setDescription(`<a:yukle:1440677432976867448> **${mode.toUpperCase()}** protokolü yürütülüyor. Lütfen bekleyin...`);
            
            await i.update({ embeds: [procEmbed], components: [] });

            try {
                let toDelete = fetched.filter(m => m.id !== mainMsg.id && m.id !== message.id);

                // --- ZIP YEDEKLEME MANTIĞI ---
                if (mode === 'backup_clear') {
                    const zip = new AdmZip();
                    let logContent = `Grave Arşiv Sistemi\nKanal: ${message.channel.name}\nTarih: ${new Date().toLocaleString()}\nYetkili: ${message.author.tag}\n--------------------------\n\n`;
                    
                    const archiveList = Array.from(toDelete.values()).slice(0, miktar);
                    archiveList.forEach(msg => {
                        logContent += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content || "[Dosya/Embed]"}\n`;
                    });

                    zip.addFile("mesaj-arsivi.txt", Buffer.from(logContent, "utf8"));
                    const attachment = new AttachmentBuilder(zip.toBuffer(), { name: `Grave_Arsiv_${message.channel.id}.zip` });

                    await message.author.send({ 
                        content: `🛡️ **${message.channel.name}** kanalında yapılan temizlik operasyonunun yedeği ekte!`, 
                        files: [attachment] 
                    }).catch(() => {
                        i.followUp({ content: "⚠️ DM kutunuz kapalı olduğu için yedeği özelden gönderemedim!", ephemeral: true });
                    });
                }

                // --- FİLTRELEME MANTIĞI ---
                if (mode === 'user') {
                    const target = message.mentions.users.first();
                    if (!target) return i.followUp({ content: '❌ Kullanıcı etiketlemediniz!', ephemeral: true });
                    toDelete = toDelete.filter(m => m.author.id === target.id);
                } else if (mode === 'bots') {
                    toDelete = toDelete.filter(m => m.author.bot);
                } else if (mode === 'links') {
                    toDelete = toDelete.filter(m => /https?:\/\/[^\s]+/.test(m.content));
                }

                const deleteList = Array.from(toDelete.values()).slice(0, miktar);
                if (deleteList.length === 0) return i.followUp({ content: '🔍 Kriterlere uygun mesaj bulunamadı.', ephemeral: true });

                const deleted = await message.channel.bulkDelete(deleteList, true);

                const finalEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setAuthor({ name: 'Operasyon Tamamlandı', iconURL: client.user.displayAvatarURL() })
                    .setDescription(`**${deleted.size}** mesaj başarıyla imha edildi.`)
                    .addFields(
                        { name: '📂 Protokol', value: `\`${mode.toUpperCase()}\``, inline: true },
                        { name: '📦 Arşiv', value: mode === 'backup_clear' ? '`ZIP (DM Gönderildi)`' : '`Yok`', inline: true }
                    )
                    .setFooter({ text: 'Grave • Güvenli temizlik sağlandı.' })
                    .setTimestamp();

                await mainMsg.edit({ embeds: [finalEmbed] });

                setTimeout(() => {
                    mainMsg.delete().catch(() => {});
                    message.delete().catch(() => {});
                }, 5000);

            } catch (err) {
                console.error(err);
                const errEmbed = new EmbedBuilder().setColor('Red').setTitle('❌ Hata').setDescription('Bir sorun oluştu. Yetkileri kontrol edin.');
                await mainMsg.edit({ embeds: [errEmbed] });
            }
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && mainMsg) {
            mainMsg.edit({ embeds: [new EmbedBuilder().setColor('Grey').setDescription('⏰ Zaman aşımı.')], components: [] }).catch(() => {});
        }
    });
};

module.exports.conf = { aliases: ["clear", "sil", "purge", "temizle"] };
module.exports.help = { name: "temizle" };
