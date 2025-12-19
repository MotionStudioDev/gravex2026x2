const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ Yetki Yetersiz")
                .setDescription("Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın.")]
        });
    }

    let miktar = 0;
    let user = null;
    let onlyBots = false;

    // Argümanları parse et
    if (args[0] === "bot" || args[0] === "bots") {
        onlyBots = true;
        miktar = parseInt(args[1]);
    } else {
        const mentionedUser = message.mentions.members.first();
        if (mentionedUser) {
            user = mentionedUser.user;
            miktar = parseInt(args[1]) || parseInt(args[0]);
        } else {
            miktar = parseInt(args[0]);
        }
    }

    if (!miktar || isNaN(miktar) || miktar < 1 || miktar > 100) {
        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ Geçersiz Sayı")
                .setDescription("Lütfen **1-100** arasında bir sayı gir.\n\n**Kullanım örnekleri:**\n`g!temizle 50`\n`g!temizle 30 @kullanıcı`\n`g!temizle bot 75`")]
        });
    }

    const confirmEmbed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle("🧹 Mesaj Temizleme Onayı")
        .setDescription([
            `**${miktar}** mesaj silinecek.`,
            user ? `Sadece **${user.tag}**'ın mesajları silinecek.` : "",
            onlyBots ? "Sadece **bot mesajları** silinecek." : "",
            "\nOnaylıyor musun?"
        ].filter(Boolean).join("\n"))
        .setFooter({ text: "15 saniye içinde onay vermezsen işlem iptal olur." });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("evet").setLabel("Evet, Sil").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("hayir").setLabel("İptal").setStyle(ButtonStyle.Secondary)
    );

    const confirmMsg = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

    const collector = confirmMsg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 15000
    });

    collector.on("collect", async i => {
        if (i.customId === "hayir") {
            await i.update({
                embeds: [new EmbedBuilder().setColor("Red").setTitle("❌ İşlem İptal Edildi").setDescription("Mesaj temizleme iptal edildi.")],
                components: []
            });
            collector.stop();
            return;
        }

        if (i.customId === "evet") {
            await i.update({
                embeds: [new EmbedBuilder().setColor("Blurple").setTitle("⏳ Siliniyor...").setDescription("Mesajlar siliniyor, lütfen bekle.")],
                components: []
            });

            try {
                let deletedCount = 0;
                let fetched;

                do {
                    fetched = await message.channel.messages.fetch({ limit: 100 });
                    let toDelete = fetched;

                    if (user) toDelete = toDelete.filter(m => m.author.id === user.id);
                    if (onlyBots) toDelete = toDelete.filter(m => m.author.bot);

                    // 14 günden eski mesajları çıkar (Discord kısıtlaması)
                    toDelete = toDelete.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

                    if (toDelete.size === Kari 0) break;

                    const deleted = await message.channel.bulkDelete(toDelete, true);
                    deletedCount += deleted.size;

                    if (deletedCount >= miktar) break;
                } while (fetched.size === 100 && deletedCount < miktar);

                // Geriye kalanları tek tek sil (eğer 14 günden eskiyse bulkDelete çalışmaz)
                if (deletedCount < miktar) {
                    const remaining = miktar - deletedCount;
                    const remainingMessages = await message.channel.messages.fetch({ limit: remaining });
                    let filtered = remainingMessages;

                    if (user) filtered = filtered.filter(m => m.author.id === user.id);
                    if (onlyBots) filtered = filtered.filter(m => m.author.bot);

                    for (const msg of filtered.values()) {
                        await msg.delete().catch(() => {});
                        deletedCount++;
                        if (deletedCount >= miktar) break;
                    }
                }

                const successEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Temizleme Tamamlandı")
                    .setDescription(`Toplam **${deletedCount}** mesaj başarıyla silindi.`)
                    .setFooter({ text: `Yetkili: ${message.author.tag}` });

                // Onay mesajı silindiyse yeni mesaj gönder
                if (confirmMsg.deleted) {
                    await message.channel.send({ embeds: [successEmbed] });
                } else {
                    await confirmMsg.edit({ embeds: [successEmbed], components: [] });
                }

            } catch (err) {
                console.error("Temizleme hatası:", err);
                const errorEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Hata Oluştu")
                    .setDescription("Mesajlar silinirken bir sorun oluştu. Yetkileri kontrol et.");

                if (!confirmMsg.deleted) {
                    await confirmMsg.edit({ embeds: [errorEmbed], components: [] });
                } else {
                    await message.channel.send({ embeds: [errorEmbed] });
                }
            }

            collector.stop();
        }
    });

    collector.on("end", collected => {
        if (collected.size === 0 && !confirmMsg.deleted) {
            confirmMsg.edit({
                embeds: [new EmbedBuilder().setColor("Grey").setTitle("⏰ Zaman Aşımı").setDescription("Onay verilmedi, işlem iptal edildi.")],
                components: []
            }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ["clear", "purge", "sil", "clean"]
};

module.exports.help = {
    name: "temizle",
    description: "Belirtilen miktarda mesaj siler. Kullanıcı veya bot filtreli silme destekler.",
    usage: "temizle <miktar> [@kullanıcı / bot]"
};
