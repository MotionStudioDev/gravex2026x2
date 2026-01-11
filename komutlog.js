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
    const logKanalID = "1459996087728345280"; // Log kanalı ID'sini buraya gir

    const getSafeLog = () => client.channels.cache.get(logKanalID);

    // === KOMUT KULLANIM LOGU ===
    client.on("messageCreate", async (message) => {
        try {
            // Bot mesajlarını ve DM'leri yoksay
            if (message.author.bot || !message.guild) return;

            const prefix = "g+";
            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // Komutu bul
            const command = client.commands.get(commandName) ||
                client.commands.find(cmd => cmd.conf?.aliases?.includes(commandName));

            // Komut yoksa log atma
            if (!command) return;

            // Log kanalını al
            const logChannel = getSafeLog();
            if (!logChannel) return;

            // Kullanıcı bilgileri
            const user = message.author;
            const guild = message.guild;
            const channel = message.channel;

            // Komut argümanları (maksimum 1024 karakter)
            const commandArgs = args.length > 0 ? args.join(" ") : "Argüman yok";
            const displayArgs = commandArgs.length > 1000 ? commandArgs.substring(0, 1000) + "..." : commandArgs;

            // Kullanıcının sunucudaki rolleri
            const member = await guild.members.fetch(user.id).catch(() => null);
            const roles = member?.roles.cache
                .filter(role => role.id !== guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.name)
                .slice(0, 5)
                .join(", ") || "Rol yok";

            // Kullanıcının yetkisi
            const isAdmin = member?.permissions.has(PermissionsBitField.Flags.Administrator);
            const yetkiDurumu = isAdmin ? "🔴 YÖNETİCİ" : "🟢 KULLANICI";

            // Embed oluştur
            const commandLogEmbed = new EmbedBuilder()
                .setColor("#00d4ff")
                .setAuthor({
                    name: `⚡ KOMUT KULLANIMI ALGILANDI`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTitle(`📌 ${command.help.name.toUpperCase()} Komutu Çalıştırıldı`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    {
                        name: '👤 KULLANICI BİLGİLERİ',
                        value: `> **Tag:** ${user.tag}\n> **ID:** \`${user.id}\`\n> **Yetki:** \`${yetkiDurumu}\``,
                        inline: false
                    },
                    {
                        name: '🏰 SUNUCU BİLGİLERİ',
                        value: `> **Sunucu:** ${guild.name}\n> **ID:** \`${guild.id}\`\n> **Üye Sayısı:** \`${guild.memberCount}\``,
                        inline: true
                    },
                    {
                        name: '📍 KANAL BİLGİLERİ',
                        value: `> **Kanal:** ${channel.name}\n> **ID:** \`${channel.id}\`\n> **Tip:** \`${channel.type}\``,
                        inline: true
                    },
                    {
                        name: '⚙️ KOMUT DETAYLARI',
                        value: `> **Komut:** \`${prefix}${commandName}\`\n> **Argümanlar:** \`${displayArgs}\`\n> **Alias:** \`${command.conf?.aliases?.join(", ") || "Yok"}\``,
                        inline: false
                    },
                    {
                        name: '🎭 ROLLER (İlk 5)',
                        value: `> ${roles}`,
                        inline: false
                    },
                    {
                        name: '🔗 MESAJ LİNKİ',
                        value: `> [Mesaja Git](${message.url})`,
                        inline: false
                    }
                )
                .setFooter({
                    text: `GraveOS Komut İzleme Sistemi v2.0 • Global: ${client.guilds.cache.size} Sunucu`
                })
                .setTimestamp();

            // Butonlar
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`cmd_msg_${user.id}`)
                    .setLabel("Kullanıcıya Mesaj")
                    .setEmoji("📧")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`cmd_warn_${user.id}`)
                    .setLabel("Uyarı Gönder")
                    .setEmoji("⚠️")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`cmd_info_${guild.id}`)
                    .setLabel("Sunucu Detayları")
                    .setEmoji("🔍")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setLabel("Mesaja Git")
                    .setStyle(ButtonStyle.Link)
                    .setURL(message.url)
                    .setEmoji("🔗")
            );

            // Log kanalına gönder
            await logChannel.send({
                embeds: [commandLogEmbed],
                components: [buttons]
            }).catch(err => console.error("Log gönderilirken hata:", err));

        } catch (err) {
            console.error("Komut log hatası:", err);
        }
    });

    // === BUTON ETKİLEŞİMLERİ ===
    client.on("interactionCreate", async (i) => {
        try {
            if (!i.isButton()) return;

            // Kullanıcıya mesaj gönder
            if (i.customId.startsWith("cmd_msg_")) {
                const targetId = i.customId.split("_")[2];
                const modal = new ModalBuilder()
                    .setCustomId(`cmd_modal_msg_${targetId}`)
                    .setTitle('Kullanıcıya Mesaj Gönder');

                const messageInput = new TextInputBuilder()
                    .setCustomId('message_content')
                    .setLabel("Mesajınız")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Kullanıcıya göndermek istediğiniz mesajı yazın...")
                    .setRequired(true)
                    .setMaxLength(2000);

                modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
                return await i.showModal(modal);
            }

            // Uyarı gönder
            if (i.customId.startsWith("cmd_warn_")) {
                const targetId = i.customId.split("_")[2];
                const modal = new ModalBuilder()
                    .setCustomId(`cmd_modal_warn_${targetId}`)
                    .setTitle('Uyarı Mesajı Gönder');

                const warnInput = new TextInputBuilder()
                    .setCustomId('warn_content')
                    .setLabel("Uyarı Nedeni")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Uyarı sebebini yazın...")
                    .setRequired(true)
                    .setMaxLength(1000);

                modal.addComponents(new ActionRowBuilder().addComponents(warnInput));
                return await i.showModal(modal);
            }

            // Sunucu detayları
            if (i.customId.startsWith("cmd_info_")) {
                const guildId = i.customId.split("_")[2];
                const targetGuild = client.guilds.cache.get(guildId);

                if (!targetGuild) {
                    const errEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("❌ Sunucu bulunamadı.");
                    return i.reply({ embeds: [errEmbed], ephemeral: true });
                }

                const owner = await targetGuild.fetchOwner().catch(() => null);
                const createdAt = Math.floor(targetGuild.createdTimestamp / 1000);

                const infoEmbed = new EmbedBuilder()
                    .setColor("#00d4ff")
                    .setTitle(`🏰 ${targetGuild.name} - Sunucu Detayları`)
                    .setThumbnail(targetGuild.iconURL({ dynamic: true }))
                    .addFields(
                        {
                            name: '📊 Genel Bilgiler',
                            value: `> **ID:** \`${targetGuild.id}\`\n> **Kurucu:** ${owner ? owner.user.tag : 'Bilinmiyor'}\n> **Oluşturulma:** <t:${createdAt}:R>`,
                            inline: false
                        },
                        {
                            name: '👥 Üye İstatistikleri',
                            value: `> **Toplam:** \`${targetGuild.memberCount}\`\n> **Roller:** \`${targetGuild.roles.cache.size}\`\n> **Emojiler:** \`${targetGuild.emojis.cache.size}\``,
                            inline: true
                        },
                        {
                            name: '📡 Kanal İstatistikleri',
                            value: `> **Toplam:** \`${targetGuild.channels.cache.size}\`\n> **Metin:** \`${targetGuild.channels.cache.filter(c => c.type === 0).size}\`\n> **Ses:** \`${targetGuild.channels.cache.filter(c => c.type === 2).size}\``,
                            inline: true
                        },
                        {
                            name: '⚙️ Sunucu Özellikleri',
                            value: `> **Boost Seviyesi:** \`${targetGuild.premiumTier}\`\n> **Boost Sayısı:** \`${targetGuild.premiumSubscriptionCount || 0}\`\n> **Doğrulama:** \`${targetGuild.verificationLevel}\``,
                            inline: false
                        }
                    )
                    .setFooter({ text: 'GraveOS Sunucu Analiz Sistemi' })
                    .setTimestamp();

                return i.reply({ embeds: [infoEmbed], ephemeral: true });
            }

        } catch (err) {
            console.error("Buton etkileşim hatası:", err);
        }
    });

    // === MODAL SUBMIT İŞLEMLERİ ===
    client.on("interactionCreate", async (i) => {
        try {
            if (!i.isModalSubmit()) return;

            // Mesaj gönderme
            if (i.customId.startsWith("cmd_modal_msg_")) {
                const targetId = i.customId.split("_")[3];
                const messageContent = i.fields.getTextInputValue('message_content');
                await i.deferReply({ ephemeral: true });

                const user = await client.users.fetch(targetId).catch(() => null);
                if (!user) {
                    const noUser = new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("❌ Kullanıcı bulunamadı.");
                    return i.editReply({ embeds: [noUser] });
                }

                const messageEmbed = new EmbedBuilder()
                    .setColor("#00d4ff")
                    .setAuthor({
                        name: 'GraveOS Yönetim Sistemi',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setTitle('📧 Yeni Mesaj Aldınız')
                    .setDescription(`**Mesaj İçeriği:**\n${messageContent}`)
                    .setFooter({ text: 'GraveOS Bildirim Sistemi' })
                    .setTimestamp();

                await user.send({ embeds: [messageEmbed] })
                    .then(() => {
                        const success = new EmbedBuilder()
                            .setColor("Green")
                            .setDescription(`✅ Mesaj **${user.tag}** kullanıcısına başarıyla gönderildi.`);
                        i.editReply({ embeds: [success] });
                    })
                    .catch(() => {
                        const fail = new EmbedBuilder()
                            .setColor("Red")
                            .setDescription("❌ Kullanıcının DM kutusu kapalı veya mesaj gönderilemedi.");
                        i.editReply({ embeds: [fail] });
                    });
            }

            // Uyarı gönderme
            if (i.customId.startsWith("cmd_modal_warn_")) {
                const targetId = i.customId.split("_")[3];
                const warnContent = i.fields.getTextInputValue('warn_content');
                await i.deferReply({ ephemeral: true });

                const user = await client.users.fetch(targetId).catch(() => null);
                if (!user) {
                    const noUser = new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("❌ Kullanıcı bulunamadı.");
                    return i.editReply({ embeds: [noUser] });
                }

                const warnEmbed = new EmbedBuilder()
                    .setColor("#ff6b00")
                    .setAuthor({
                        name: 'GraveOS Güvenlik Sistemi',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setTitle('⚠️ UYARI ALDINIZ')
                    .setDescription(`**Uyarı Nedeni:**\n${warnContent}`)
                    .addFields({
                        name: '📋 Bilgilendirme',
                        value: '> Lütfen bot kullanım kurallarına uygun davranın.\n> Tekrarlayan ihlaller yasaklanmanıza sebep olabilir.'
                    })
                    .setFooter({ text: 'GraveOS Güvenlik Protokolü' })
                    .setTimestamp();

                await user.send({ embeds: [warnEmbed] })
                    .then(() => {
                        const success = new EmbedBuilder()
                            .setColor("Orange")
                            .setDescription(`⚠️ Uyarı **${user.tag}** kullanıcısına başarıyla gönderildi.`);
                        i.editReply({ embeds: [success] });
                    })
                    .catch(() => {
                        const fail = new EmbedBuilder()
                            .setColor("Red")
                            .setDescription("❌ Kullanıcının DM kutusu kapalı veya uyarı gönderilemedi.");
                        i.editReply({ embeds: [fail] });
                    });
            }

        } catch (err) {
            console.error("Modal submit hatası:", err);
        }
    });
};
