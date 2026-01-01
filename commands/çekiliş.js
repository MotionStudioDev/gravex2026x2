const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const Giveaway = require('../models/Giveaway'); // Veritabanı modelini buraya bağla

module.exports.run = async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('<a:xxxx:1445123377181360138> Bu sistemi yönetmek için `Mesajları Yönet` yetkin olmalı.')] });
    }

    const sureStr = args[0];
    const kazananSayisi = parseInt(args[1]);
    const odul = args.slice(2).join(' ');

    if (!sureStr || isNaN(kazananSayisi) || !odul) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('<:Information:1453765637020319872> Çekiliş Başlatma Rehberi').setDescription('Doğru kullanım: `g!çekiliş <süre> <kazanan> <ödül>`')] });
    }

    const bitisZamani = Date.now() + ms(sureStr);

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

    // --- MONGODB KAYIT ---
    await new Giveaway({
        messageId: mainMsg.id,
        channelId: message.channel.id,
        guildId: message.guild.id,
        prize: odul,
        winnerCount: kazananSayisi,
        endTime: bitisZamani,
        hostedBy: message.author.id,
        participants: [],
        ended: false
    }).save();
};

module.exports.conf = { aliases: ['c-baslat'] };
module.exports.help = { name: 'çekiliş' };
