const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField // v14'te izinler için kullanılır
} = require("discord.js");

module.exports.run = async (client, message, args) => {
    // 1. İzin Kontrolü
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply({ content: "<a:uyar1:1416526541030035530> Bu komutu kullanmak için **Üyeleri Yasakla** iznine sahip olmalısın.", ephemeral: true });
    }
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply({ content: "<a:uyar1:1416526541030035530> Bu işlemi gerçekleştirmek için benim **Üyeleri Yasakla** iznim olmalı.", ephemeral: true });
    }

    // 2. ID Kontrolü
    const userID = args[0];
    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";

    if (!userID || isNaN(userID)) {
        return message.reply({ content: "<a:uyar1:1416526541030035530> Lütfen banını kaldırmak istediğiniz kişinin geçerli bir ID'sini belirtin. Örn: `g!unban 123456789012345678 [sebep]`" });
    }
    
    // Banlı kullanıcıyı kontrol et
    const bannedUsers = await message.guild.bans.fetch().catch(() => null);
    if (!bannedUsers || !bannedUsers.has(userID)) {
        return message.reply({ content: `<a:uyar1:1416526541030035530> **${userID}** ID'sine sahip bir kullanıcı bu sunucuda banlı bulunmamaktadır.` });
    }

    const banInfo = bannedUsers.get(userID);
    const bannedTag = banInfo.user.tag;

    // 3. Onay Butonlarını Oluşturma
    const confirmButton = new ButtonBuilder()
        .setCustomId("unban_confirm")
        .setLabel("✅ Evet, Kaldır")
        .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
        .setCustomId("unban_cancel")
        .setLabel("❌ Hayır, İptal Et")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    // 4. Onay Mesajını Gönderme
    const confirmEmbed = new EmbedBuilder()
        .setColor("Yellow")
        .setTitle("<a:uyar1:1416526541030035530> Ban Kaldırma Onayı")
        .setDescription(`**${bannedTag}** (\`${userID}\`) adlı kullanıcının yasağı **"${reason}"** sebebiyle kaldırılacaktır.\n\n**Bu kişinin banı kaldırılsın mı?**`)
        .setFooter({ text: "Bu işlem 60 saniye içinde cevaplanmalıdır." });

    const msg = await message.channel.send({
        embeds: [confirmEmbed],
        components: [row]
    });

    // 5. Collector Oluşturma
    const filter = (interaction) => interaction.customId === 'unban_confirm' || interaction.customId === 'unban_cancel';
    
    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id && filter(i),
        time: 60000 // 60 saniye
    });

    collector.on("collect", async (interaction) => {
        // Collector'ü durdur
        collector.stop();

        // Butonları devre dışı bırak
        const disabledRow = new ActionRowBuilder().addComponents(
            confirmButton.setDisabled(true),
            cancelButton.setDisabled(true)
        );

        if (interaction.customId === "unban_confirm") {
            // Banı Kaldır
            await interaction.guild.bans.remove(userID, reason).catch(e => {
                console.error("Ban kaldırma hatası:", e);
                return interaction.editReply({ 
                    content: "Ban kaldırma sırasında bir hata oluştu.", 
                    embeds: [], 
                    components: [] 
                });
            });

            // Başarılı Mesajı ve 3 saniye sonra silme
            const successEmbed = new EmbedBuilder()
                .setColor("Green")
                .setDescription(`<a:tickgre:1416899456246349854> Ban kaldırma işlemi tamamlandı! **${bannedTag}** kullanıcısının yasağı kaldırıldı.`);
            
            await interaction.update({ 
                embeds: [successEmbed], 
                components: [disabledRow] // Butonlar devre dışı
            });

            // 3 saniye sonra mesajı sil
            setTimeout(() => {
                msg.delete().catch(() => {});
            }, 3000);

        } else if (interaction.customId === "unban_cancel") {
            // İptal Mesajı
            const cancelEmbed = new EmbedBuilder()
                .setColor("Red")
                .setDescription(`<a:xxxx:1445123377181360138> İşlem reddedildi! Ban kaldırma işlemi yapılmadı.`);
            
            await interaction.update({ 
                embeds: [cancelEmbed], 
                components: [disabledRow] // Butonlar devre dışı
            });
        }
    });

    collector.on("end", async (collected, reason) => {
        // Zaman aşımı durumunda butonu devre dışı bırak
        if (reason === 'time') {
            const timeOutEmbed = new EmbedBuilder()
                .setColor("Grey")
                .setDescription(`<a:xxxx:1445123377181360138> İşlem zaman aşımına uğradı. Ban kaldırma işlemi yapılmadı.`);
                
            const disabledRow = new ActionRowBuilder().addComponents(
                confirmButton.setDisabled(true),
                cancelButton.setDisabled(true)
            );

            await msg.edit({ embeds: [timeOutEmbed], components: [disabledRow] }).catch(() => {});
        }
    });
};

module.exports.conf = {
    aliases: ["banaffet", "ban-kaldır"],
    permLevel: 0 // İsteğe bağlı olarak izin seviyesini belirleyebilirsiniz
};

module.exports.help = {
    name: 'unban'
};
