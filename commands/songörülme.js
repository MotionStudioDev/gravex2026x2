const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const moment = require("moment");
moment.locale('tr');

// --- EMOJİLER ---
const EMOJI = {
    TIK: '✅',
    X: '❌',
    SAAT: '⏱️',
    GIRIS: '🟢',
    CIKIS: '🔴'
};

// --------------------------------------------------------------------------------------
// KOMUT İŞLEYİCİ
// --------------------------------------------------------------------------------------
module.exports.run = async (client, message, args) => {
    // Mesajı silmek için 'ManageMessages' yetkisi kontrolü (isteğe bağlı)
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        // message.channel.send("Bu komutu kullanmak için yetkiniz yok.").then(m => setTimeout(() => m.delete(), 5000));
        // return message.delete();
    }

    // Kullanıcıyı bulma
    const target =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[0]);

    if (!target) {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle(`${EMOJI.X} | Kullanıcı Bulunamadı`)
                    .setDescription("Lütfen geçerli bir kullanıcı etiketleyin veya ID girin.")
            ]
        });
    }

    // Kullanıcının presence (durum/çevrimiçi bilgisi) nesnesini alıyoruz.
    const presence = target.presence;
    const user = target.user;
    
    // Geçerli aktiflik bilgisi kontrolü
    if (!presence) {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Grey")
                    .setTitle(`${EMOJI.SAAT} | Son Durum Bilgisi`)
                    .setDescription(`**${user.tag}** kullanıcısının anlık çevrimiçi durumu bulunamadı veya çevrimdışı.`)
                    .addFields(
                        { name: "Hesap Oluşturulma", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:f>`, inline: false },
                        { name: "Sunucuya Katılma", value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:f>`, inline: false }
                    )
            ]
        });
    }

    // Botun mesajını göndermeden önce "Bekleyin" mesajı atılması
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Lütfen bekleyin, veriler analiz ediliyor...');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // Anlık durum (status) ve son aktif olma zamanı
    const lastSeenTimestamp = presence.lastStatusUpdateTimestamp || Date.now(); 
    const lastSeenTime = moment(lastSeenTimestamp).format('DD MMMM YYYY HH:mm');
    const lastSeenRelative = moment(lastSeenTimestamp).fromNow();

    // Not: Discord.js, "Son Giriş" ve "Son Çıkış" verilerini loglamaz. 
    // Bu yüzden görseldeki gibi kesin bir "Son Çıkış" süresi veremeyiz.
    // Bunun yerine, en son durum güncellemesini "Son Görülme" olarak kullanıyoruz.

    let statusEmoji;
    let statusText;
    switch (presence.status) {
        case 'online':
            statusEmoji = '🟢';
            statusText = 'Çevrimiçi';
            break;
        case 'idle':
            statusEmoji = '🌙';
            statusText = 'Boşta';
            break;
        case 'dnd':
            statusEmoji = '⛔';
            statusText = 'Rahatsız Etmeyin';
            break;
        default:
            statusEmoji = '⚫';
            statusText = 'Çevrimdışı';
    }


    const resultEmbed = new EmbedBuilder()
        .setColor('Grey')
        .setTitle(`${EMOJI.SAAT} | ${user.username} Kişisinin Son Durumu`)
        .setDescription(`Bu bilgiler, **${user.username}** kullanıcısının Discord tarafından en son güncellenen durum verilerine dayanır.`)
        .addFields(
            // Görseldeki formatı taklit etme
            { name: "Son Görülme Durumu", value: `${statusEmoji} ${statusText}`, inline: false },
            { 
                name: "Son Durum Güncelleme:", 
                value: `Tarih: **${lastSeenTime}**\n(Yaklaşık **${lastSeenRelative}**)`, 
                inline: false 
            },
            // Görseldeki "Son Çıkıştan Son Girişe Kadar Geçen Süre" yerine
            // "Son Güncellemeden Bu Yana Geçen Süre" (Relative) kullanıyoruz.
            { 
                name: "En Son Görüldüğünden Beri Geçen Süre:", 
                value: `**${lastSeenRelative}**`, 
                inline: false 
            }
        )
        .setFooter({ text: `Sorgulayan: ${message.author.tag}` })
        .setTimestamp();

    await msg.edit({ embeds: [resultEmbed] });
};

module.exports.conf = {
    aliases: ["sondurum", "sonaktif"],
    permLevel: 0
};

module.exports.help = {
    name: "sonaktiflik",
    description: "Kullanıcının Discord'daki son durum güncelleme tarihini ve süresini gösterir.",
    usage: 'g!sonaktiflik [@Kullanıcı]'
};
