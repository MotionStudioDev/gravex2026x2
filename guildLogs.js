const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionsBitField 
} = require("discord.js");

module.exports = (client) => {
    const logKanalID = "1416358157558485022";

    const getSafeLog = () => client.channels.cache.get(logKanalID);

    // --- 1. SUNUCUYA KATILMA LOGU ---
    client.on("guildCreate", async (guild) => {
        try {
            if (!guild) return;
            const logChannel = getSafeLog();
            if (!logChannel) return;

            const owner = await guild.fetchOwner().catch(() => null);
            const botMember = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
            const botYetki = botMember?.permissions.has(PermissionsBitField.Flags.Administrator) ? "🔴 YÖNETİCİ" : "🟡 KISITLI";

            const joinedEmbed = new EmbedBuilder()
                .setColor("#00ffcc")
                .setAuthor({ name: '🛰️ YENİ BAĞLANTI KURULDU', iconURL: client.user.displayAvatarURL() })
                .setTitle(`📌 ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
                .addFields(
                    { name: '👤 KURUCU', value: `> **Tag:** ${owner ? owner.user.tag : 'Bilinmiyor'}\n> **ID:** \`${owner ? owner.id : '---'}\``, inline: false },
                    { name: '📊 İSTATİSTİK', value: `> **Üye:** \`${guild.memberCount}\`\n> **Yetki:** \`${botYetki}\``, inline: true },
                    { name: '⚙️ SİSTEM', value: `> **ID:** \`${guild.id}\`\n> **Global:** \`${client.guilds.cache.size}\``, inline: true }
                )
                .setFooter({ text: `GraveOS Terminal v13.5` })
                .setTimestamp();

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`omega_msg_${owner?.id || "0"}`).setLabel("Mesaj Gönder").setEmoji("📧").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`omega_lv_${guild.id}`).setLabel("Bağlantıyı Kes").setEmoji("🚪").setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ embeds: [joinedEmbed], components: [buttons] }).catch(() => null);
        } catch (err) { console.error(err); }
    });

    // --- 2. SUNUCUDAN ATILMA LOGU ---
    client.on("guildDelete", async (guild) => {
        try {
            if (!guild) return;
            const logChannel = getSafeLog();
            if (!logChannel) return;

            const exitLog = new EmbedBuilder()
                .setColor("#ff003c")
                .setAuthor({ name: '⚠️ SİSTEMDEN ÇIKARILDI', iconURL: guild.iconURL({ dynamic: true }) })
                .setDescription(`\`\`\`diff\n- ${guild.name} sunucusuyla olan tüm veri akışı sonlandırıldı.\n\`\`\``)
                .addFields(
                    { name: '🆔 SUNUCU ID', value: `\`${guild.id}\``, inline: true },
                    { name: '👥 SON ÜYE', value: `\`${guild.memberCount || "---"}\``, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [exitLog] }).catch(() => null);
        } catch (err) { console.error(err); }
    });

    // --- 3. ETKİLEŞİM YÖNETİMİ ---
    client.on("interactionCreate", async (i) => {
        try {
            if (!i) return;

            // BUTONLAR
            if (i.isButton()) {
                if (i.customId.startsWith("omega_msg_")) {
                    const targetId = i.customId.split("_")[2];
                    const modal = new ModalBuilder().setCustomId(`omg_mdl_${targetId}`).setTitle('Sistem Mesajı');
                    const text = new TextInputBuilder().setCustomId('msg_content').setLabel("İleti").setStyle(TextInputStyle.Paragraph).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(text));
                    return await i.showModal(modal);
                }

                if (i.customId.startsWith("omega_lv_")) {
                    const gId = i.customId.split("_")[2];
                    const targetGuild = client.guilds.cache.get(gId);
                    
                    if (!targetGuild) {
                        const errEmbed = new EmbedBuilder().setColor("Red").setDescription("❌ Sunucu hafızada bulunamadı.");
                        return i.reply({ embeds: [errEmbed], ephemeral: true });
                    }
                    
                    const guildName = targetGuild.name;
                    await targetGuild.leave().catch(() => null);

                    // KOVMA ONAY EMBEDİ
                    const leaveSuccess = new EmbedBuilder()
                        .setColor("#ffaa00")
                        .setTitle("🚪 Bağlantı Kesildi")
                        .setDescription(`**${guildName}** sunucusundan güvenli bir şekilde ayrıldım.\n\n\`\`\`fix\nİşlem başarılı. Sunucu veri listesinden silindi.\n\`\`\``)
                        .setFooter({ text: "GraveOS Güvenlik Protokolü" })
                        .setTimestamp();

                    return i.reply({ embeds: [leaveSuccess], ephemeral: true });
                }
            }

            // MODAL SUBMIT
            if (i.isModalSubmit() && i.customId.startsWith("omg_mdl_")) {
                const targetId = i.customId.split("_")[2];
                const message = i.fields.getTextInputValue('msg_content');
                await i.deferReply({ ephemeral: true });

                const user = await client.users.fetch(targetId).catch(() => null);
                if (!user) {
                    const noUser = new EmbedBuilder().setColor("Red").setDescription("❌ Kullanıcı bulunamadı.");
                    return i.editReply({ embeds: [noUser] });
                }

                const contactEmbed = new EmbedBuilder()
                    .setColor("#00ffcc")
                    .setAuthor({ name: 'GraveBOT Yönetimi', iconURL: client.user.displayAvatarURL() })
                    .setDescription(`**Yeni Mesaj:**\n${message}`)
                    .setTimestamp();

                await user.send({ embeds: [contactEmbed] })
                    .then(() => {
                        const ok = new EmbedBuilder().setColor("Green").setDescription(`✅ Mesaj **${user.tag}** kullanıcısına iletildi.`);
                        i.editReply({ embeds: [ok] });
                    })
                    .catch(() => {
                        const fail = new EmbedBuilder().setColor("Red").setDescription("❌ Kurucunun DM kutusu kapalı.");
                        i.editReply({ embeds: [fail] });
                    });
            }
        } catch (err) { console.error(err); }
    });
};
