const {
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    PermissionsBitField
} = require("discord.js");
const ms = require("ms"); // ms paketini kullanabilmek için projenize eklemelisiniz: npm install ms

module.exports.run = async (client, message, args) => {
    const channel = message.channel;
    // Komut adını prefix olmadan doğru şekilde alıyoruz (Örn: "lock" veya "unlock")
    const commandName = args[0] && args[0].toLowerCase() === 'unlock' ? 'unlock' : message.content.split(/\s+/)[0].replace(/^g!/, "").toLowerCase();

    // Yetki kontrolü
    if (
        !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && // 'Mesajları Yönet' yerine 'Kanalları Yönet' daha uygun
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Yetkin Yok!")
                    .setDescription("Bu komutu sadece **Kanalları Yönet** veya **Yönetici** yetkisi olanlar kullanabilir.")
                    .setTimestamp()
            ]
        });
    }

    // Kanalın mevcut durumunu kontrol etme
    const perms = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
    const isLocked = perms?.deny?.has(PermissionsBitField.Flags.SendMessages) || channel.permissionOverwrites.everyone?.deny.has(PermissionsBitField.Flags.SendMessages);

    // =========================================================
    // 🔓 UNLOCK MANTIĞI
    // =========================================================
    if (commandName === "unlock") {
        if (!isLocked) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Kanal zaten açık!")
                        .setDescription("Bu kanal kilitli değil, kilidi kaldırmaya gerek yok.")
                        .setTimestamp()
                ]
            });
        }

        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: true
        });

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#3498DB")
                    .setTitle("🔓 Kanal Kilidi Kaldırıldı!")
                    .setDescription(`Kanal, ${message.author} tarafından açıldı.`)
                    .setTimestamp()
            ]
        });
    }

    // =========================================================
    // 🔒 LOCK MANTIĞI
    // =========================================================

    if (isLocked) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Kanal zaten kilitli!")
                    .setDescription("Bu kanalı tekrar kilitleyemezsin.")
                    .setTimestamp()
            ]
        });
    }

    // Zaman ve Sebep Argümanlarını Alma
    let duration = args[0]; // İlk argüman zaman olabilir (ör: 5m)
    let reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";

    let durationMs = null;
    let durationText = "Süresiz";
    
    // Süre kontrolü ve ayrıştırma
    if (duration && ms(duration)) {
        durationMs = ms(duration);
        durationText = `${ms(durationMs, { long: true })} süresince`;
        reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";
    } else {
        // Eğer ilk argüman geçerli bir süre değilse, tümünü sebep kabul et
        reason = args.join(" ") || "Sebep belirtilmedi.";
        duration = null;
    }


    const embed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("🔒 Kanal Kilitleniyor...")
        .setDescription(`**Süre:** ${durationText}\n**Sebep:** ${reason}\n\nLütfen bekleyin.`)
        .setTimestamp();

    const msg = await message.reply({ embeds: [embed] });

    // Kilitleme işlemini yap
    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false
    }, `Kilitleyen: ${message.author.tag} | Süre: ${durationText} | Sebep: ${reason}`);

    const unlockButton = new ButtonBuilder()
        .setCustomId(`unlock_manual_${channel.id}`) // Butonu interactionCreate.js dosyasında işlemek için ID'yi değiştiriyoruz
        .setLabel("Kilidi Kaldır (Yönetici)")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(unlockButton);

    const lockedEmbed = new EmbedBuilder()
        .setColor("#FF0000") // Kırmızı, kilitli olduğunu vurgular
        .setTitle("🚨 Kanal Kilitlendi!")
        .setDescription(`Bu kanal ${durationText} mesajlara kapatılmıştır.\n\n**Sebep:** \`${reason}\`\n**Kilitleyen:** ${message.author}`)
        .setFooter({ text: durationMs ? `Kalan süre sonunda otomatik açılacaktır.` : 'Yönetici tarafından manuel açılmalıdır.' })
        .setTimestamp();

    await msg.edit({ embeds: [lockedEmbed], components: [row] });

    // Otomatik Kaldırma Zamanlayıcısı
    if (durationMs) {
        setTimeout(async () => {
            const currentPerms = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
            const stillLocked = currentPerms?.deny?.has(PermissionsBitField.Flags.SendMessages);

            if (stillLocked) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: true
                }, "Süre dolduğu için otomatik açıldı.");

                const autoUnlockEmbed = new EmbedBuilder()
                    .setColor("#00FF00")
                    .setTitle("⌛ Kanal Otomatik Açıldı")
                    .setDescription(`Kilit süresi dolduğu için kanal tekrar mesajlara açılmıştır.`)
                    .setTimestamp();

                channel.send({ embeds: [autoUnlockEmbed] }).catch(() => {});
            }
        }, durationMs);
    }
};

module.exports.conf = {
    // "unlock" komutu kaldırıldı, artık argüman olarak ele alınıyor.
    aliases: ["kilit", "kilitle"] 
};

module.exports.help = {
    name: "lock" // Artık temel komut adı "lock"
};
