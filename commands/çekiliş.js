const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');

module.exports.run = async (client, message, args) => {
    // YETKİ KONTROLÜ
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const errorEmbed = new EmbedBuilder()
            .setColor('Red')
            .setDescription('<a:xxxx:1445123377181360138> Bu sistemi yönetmek için `Mesajları Yönet` yetkin olmalı.');
        return message.reply({ embeds: [errorEmbed] });
    }

    const sureStr = args[0];
    const kazananSayisi = parseInt(args[1]);
    const odul = args.slice(2).join(' ');

    if (!sureStr || isNaN(kazananSayisi) || !odul) {
        const usageEmbed = new EmbedBuilder()
            .setColor('Yellow')
            .setTitle('<:Information:1453765637020319872> Çekiliş Başlatma Rehberi')
            .setDescription('Doğru kullanım: `g!çekiliş <süre> <kazanan> <ödül>`\nÖrnek: `g!çekiliş 10m 1 Nitro`');
        return message.reply({ embeds: [usageEmbed] });
    }

    const bitisZamani = Date.now() + ms(sureStr);
    let katilimcilar = [];

    // --- ANA ÇEKİLİŞ EMBEDİ ---
    const giveawayEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setAuthor({ name: 'GRAVE ÇEKİLİŞ SİSTEMİ', iconURL: client.user.displayAvatarURL() })
        .setTitle('━━━━━   <:give:1455902146594734202> ÇEKİLİŞ BAŞLADI <:give:1455902146594734202>   ━━━━━')
        .setDescription(`> **<:give:1455902146594734202> Ödül:** \`${odul}\`\n> **<:userx:1441379546929561650>Kazanan Sayısı:** \`${kazananSayisi}\`\n> **<:owner:1441129983153147975> Düzenleyen:** ${message.author}\n\n**⏱️ Kalan Süre:** <t:${Math.floor(bitisZamani / 1000)}:R>`)
        .setThumbnail('https://i.giphy.com/media/v1.//giphy.gif')
        .setFooter({ text: 'Grave Çekiliş Sistemi | Katılımcı: 0' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join_gv').setLabel('Katıl').setEmoji('1455901601054330953').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('leave_gv').setLabel('Ayrıl').setEmoji('1455904873257369610').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('list_gv').setLabel('Katılımcılar').setEmoji('1441379546929561650').setStyle(ButtonStyle.Secondary)
    );

    const mainMsg = await message.channel.send({ embeds: [giveawayEmbed], components: [row] });

    const collector = mainMsg.createMessageComponentCollector({ time: ms(sureStr) });

    collector.on('collect', async (i) => {
        try {
            // Interaction'ı hemen defer ediyoruz ki "Unknown Interaction" hatası almayalım
            await i.deferReply({ ephemeral: true });

            if (i.customId === 'join_gv') {
                if (katilimcilar.includes(i.user.id)) {
                    const alreadyEmbed = new EmbedBuilder().setColor('Red').setDescription('<a:uyar1:1416526541030035530> Zaten bu çekilişe katılmışsın!');
                    return i.editReply({ embeds: [alreadyEmbed] });
                }

                katilimcilar.push(i.user.id);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setAuthor({ name: 'Grave Çekiliş Onayı', iconURL: i.guild.iconURL() })
                    .setDescription(`<a:tickgre:1416899456246349854> **${odul}** çekilişine başarıyla katıldın!`);

                await i.user.send({ embeds: [successEmbed] }).catch(() => {});
                
                const updateEmbed = EmbedBuilder.from(giveawayEmbed).setFooter({ text: `Grave Çekiliş Sistemi | Katılımcı: ${katilimcilar.length}` });
                await mainMsg.edit({ embeds: [updateEmbed] }).catch(() => {});
                
                await i.editReply({ embeds: [successEmbed] });
            }

            if (i.customId === 'leave_gv') {
                if (!katilimcilar.includes(i.user.id)) {
                    const notInEmbed = new EmbedBuilder().setColor('Red').setDescription('<a:uyar1:1416526541030035530> Zaten listede yoksun!');
                    return i.editReply({ embeds: [notInEmbed] });
                }

                katilimcilar = katilimcilar.filter(id => id !== i.user.id);
                
                const leaveEmbed = new EmbedBuilder()
                    .setColor('Orange')
                    .setDescription(`<a:giris2:1416530155601399990> **${odul}** çekilişinden ayrıldın. Katılımın iptal edildi.`);

                const updateEmbed = EmbedBuilder.from(giveawayEmbed).setFooter({ text: `Grave Çekiliş Sistemi | Katılımcı: ${katilimcilar.length}` });
                await mainMsg.edit({ embeds: [updateEmbed] }).catch(() => {});
                
                await i.editReply({ embeds: [leaveEmbed] });
            }

            if (i.customId === 'list_gv') {
                const listEmbed = new EmbedBuilder()
                    .setColor('Blue')
                    .setAuthor({ name: 'Mevcut Katılımcılar', iconURL: client.user.displayAvatarURL() })
                    .setDescription(katilimcilar.length > 0 ? katilimcilar.map(id => `<@${id}>`).join(', ').substring(0, 3900) : '*Henüz kimse katılmadı...*');
                await i.editReply({ embeds: [listEmbed] });
            }
        } catch (e) {
            console.error("Grave Interaction Error Logged.");
        }
    });

    collector.on('end', async () => {
        if (katilimcilar.length < kazananSayisi) {
            const failEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('<a:uyar1:1416526541030035530> ÇEKİLİŞ SONLANDIRILDI')
                .setDescription(`**${odul}** ödülü için yeterli katılım sağlanamadı.\n\n> Gereken: \`${kazananSayisi}\` | Katılan: \`${katilimcilar.length}\``)
                .setFooter({ text: 'Veriler analiz edildi.' });
            return mainMsg.edit({ embeds: [failEmbed], components: [] }).catch(() => {});
        }

        let winners = katilimcilar.sort(() => 0.5 - Math.random()).slice(0, kazananSayisi);
        const winnersTag = winners.map(id => `<@${id}>`).join(', ');

        const winEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('━━━━━   <:userx:1441379546929561650> KAZANANLAR BELLİ OLDU   ━━━━━')
            .setThumbnail('https://i.giphy.com/media/v1./Lp71UqhM40yoVIv64v/giphy.gif')
            .setDescription(`**<:give:1455902146594734202> Ödül:** \`${odul}\`\n**<a:12:1455902536555827307> Kazananlar:** ${winnersTag}\n** <:userx:1441379546929561650> Katılımcı Sayısı:** \`${katilimcilar.length}\``)
            .setFooter({ text: 'Kura tekrar çekildi!' })
            .setTimestamp();

        const rerollRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reroll_gv').setLabel('Yeniden Seç').setEmoji('1440677432976867448').setStyle(ButtonStyle.Danger)
        );

        await mainMsg.edit({ embeds: [winEmbed], components: [rerollRow] }).catch(() => {});
        
        const announceEmbed = new EmbedBuilder().setColor('Gold').setDescription(`<:ekil:1455901601054330953> Tebrikler ${winnersTag}! **${odul}** çekilişini kazandınız!`);
        message.channel.send({ embeds: [announceEmbed] });

        winners.forEach(id => {
            const user = client.users.cache.get(id);
            if (user) {
                const tebrik = new EmbedBuilder()
                    .setColor('Gold')
                    .setTitle('<:ekil:1455901601054330953> MÜKEMMEL HABER!')
                    .setDescription(`**${message.guild.name}** sunucusunda düzenlenen **${odul}** çekilişini sen kazandın!`);
                user.send({ embeds: [tebrik] }).catch(() => {});
            }
        });

        const rerollCollector = mainMsg.createMessageComponentCollector({ componentType: ComponentType.Button });
        rerollCollector.on('collect', async (r) => {
            if (r.customId === 'reroll_gv') {
                if (!r.member.permissions.has(PermissionFlagsBits.ManageMessages)) return r.reply({ content: 'Yetkiniz yok.', ephemeral: true });
                await r.deferReply({ ephemeral: true });
                const yeniKazanan = katilimcilar[Math.floor(Math.random() * katilimcilar.length)];
                const rerolledEmbed = EmbedBuilder.from(winEmbed)
                    .setDescription(`**<:give:1455902146594734202> Ödül:** \`${odul}\`\n**<a:12:1455902536555827307> Yeni Kazanan:** <@${yeniKazanan}>\n**<:userx:1441379546929561650>  Katılımcı Sayısı:** \`${katilimcilar.length}\``)
                    .setFooter({ text: `Yeniden çekildi: ${new Date().toLocaleTimeString()}` });
                await mainMsg.edit({ embeds: [rerolledEmbed] }).catch(() => {});
                await r.editReply({ embeds: [new EmbedBuilder().setColor('Green').setDescription(`<a:tickgre:1416899456246349854>  Çekiliş başarıyla tekrarlandı. Yeni talihli: <@${yeniKazanan}>`)] });
            }
        });
    });
};

module.exports.conf = { aliases: ['c-baslat'] };
module.exports.help = { name: 'çekiliş' };
