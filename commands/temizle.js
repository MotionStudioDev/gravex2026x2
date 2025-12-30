const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, StringSelectMenuBuilder } = require("discord.js");

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
    // Kanalda o an bulunan mesajların türlerini hızlıca analiz eder
    const fetched = await message.channel.messages.fetch({ limit: 100 });
    const stats = {
        total: fetched.size,
        bots: fetched.filter(m => m.author.bot).size,
        links: fetched.filter(m => /https?:\/\/[^\s]+/.test(m.content)).size,
        media: fetched.filter(m => m.attachments.size > 0 || m.embeds.length > 0).size
    };

    const analysisEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Grave Operasyonel Temizlik Paneli', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(message.guild.iconURL())
        .setDescription(`Kanal üzerinde son mesajlar analiz edildi. Belirlenen limit: **${miktar}**\n\nLütfen aşağıdan uygulanacak protokolü seçin:`)
        .addFields(
            { name: '🤖 Botlar', value: `\`${stats.bots} Mesaj\``, inline: true },
            { name: '🔗 Linkler', value: `\`${stats.links} Mesaj\``, inline: true },
            { name: '🖼️ Medya', value: `\`${stats.media} Mesaj\``, inline: true }
        )
        .setFooter({ text: 'Seçim yapmanız için 30 saniyeniz var.' });

    const menuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('op_menu')
            .setPlaceholder('Temizlik Protokolünü Onayla')
            .addOptions([
                { 
                    label: `Seçilen Sayı Kadar Sil (${miktar})`, 
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
                },
                { 
                    label: 'Medya İmhası', 
                    description: 'Dosya, fotoğraf ve Embed içerikleri siler.', 
                    value: 'media', 
                    emoji: '🖼️' 
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
            
            // İşlem Başladı Embed'i
            const procEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setDescription(`<a:yukle:1440677432976867448> **${mode.toUpperCase()}** protokolü yürütülüyor. Veri tabanı temizleniyor...`);
            
            await i.update({ embeds: [procEmbed], components: [] });

            try {
                // Silme listesini hazırla (Botun kendi panel mesajını ve kullanıcının komutunu hariç tutar)
                let toDelete = fetched.filter(m => m.id !== mainMsg.id && m.id !== message.id);

                if (mode === 'user') {
                    const target = message.mentions.users.first();
                    if (!target) {
                        return i.followUp({ 
                            embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ **Hata:** Kullanıcı modunu kullanmak için birini etiketlemeliydiniz.')], 
                            ephemeral: true 
                        });
                    }
                    toDelete = toDelete.filter(m => m.author.id === target.id);
                } else if (mode === 'bots') {
                    toDelete = toDelete.filter(m => m.author.bot);
                } else if (mode === 'links') {
                    toDelete = toDelete.filter(m => /https?:\/\/[^\s]+/.test(m.content));
                } else if (mode === 'media') {
                    toDelete = toDelete.filter(m => m.attachments.size > 0 || m.embeds.length > 0);
                }

                const deleteList = Array.from(toDelete.values()).slice(0, miktar);

                if (deleteList.length === 0) {
                    return i.followUp({ 
                        embeds: [new EmbedBuilder().setColor('Orange').setDescription('🔍 **Sonuç:** Filtreleme kriterlerine uygun mesaj bulunamadı.')], 
                        ephemeral: true 
                    });
                }

                // Toplu Silme İşlemi
                const deleted = await message.channel.bulkDelete(deleteList, true);

                const finalEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setAuthor({ name: 'Operasyon Tamamlandı', iconURL: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' })
                    .setDescription(`**${deleted.size}** adet mesaj kalıcı olarak imha edildi.`)
                    .addFields(
                        { name: '📂 Protokol', value: `\`${mode.toUpperCase()}\``, inline: true },
                        { name: '🛡️ Yetkili', value: `${message.author}`, inline: true }
                    )
                    .setFooter({ text: 'Kanal temizliği sağlandı.' })
                    .setTimestamp();

                await mainMsg.edit({ embeds: [finalEmbed] });

                // 5 saniye sonra arayüzü temizle
                setTimeout(() => {
                    mainMsg.delete().catch(() => {});
                    message.delete().catch(() => {});
                }, 5000);

            } catch (err) {
                console.error(err);
                const errEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('❌ Kritik Hata')
                    .setDescription('Mesajlar 14 günden eski olabilir veya botun mesajları silme yetkisi kısıtlanmış.');
                await mainMsg.edit({ embeds: [errEmbed], components: [] });
            }
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && mainMsg) {
            const timeEmbed = new EmbedBuilder().setColor('Grey').setDescription('⏰ **Zaman Aşımı:** Herhangi bir protokol seçilmediği için işlem iptal edildi.');
            mainMsg.edit({ embeds: [timeEmbed], components: [] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ["clear", "sil", "purge", "temizle"]
};

module.exports.help = {
    name: "temizle",
    description: "Operasyonel panel üzerinden gelişmiş temizlik yapar.",
    usage: "temizle <miktar> [@kullanıcı]"
};
