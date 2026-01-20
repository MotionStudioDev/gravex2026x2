const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
const moment = require('moment');
require('moment/locale/tr');

module.exports = async (member) => {
  const { client, guild, user } = member;
  const guildId = guild.id;

  // Botlar için istatistik tutmaya gerek yok, sistemi yormayalım
  if (user.bot) return;

  // 1. VERİTABANI KONTROLÜ
  const settings = await GuildSettings.findOne({ guildId });
  if (!settings) return;

  // --- ANALİZ BİRİMİ: SUNUCUDA KALMA SÜRESİ ---
  const joinDate = member.joinedTimestamp;
  const stayDuration = joinDate ? Date.now() - joinDate : null;
  
  // Süreyi okunabilir formata çevir (Örn: 2 gün, 5 saat)
  const durationText = stayDuration 
    ? moment.duration(stayDuration).format("D [gün], H [saat], m [dakika]")
    : "Bilinmiyor";

  // =========================================================
  // 2. GELİŞMİŞ SAYAÇ VE ANALİZ MESAJI
  // =========================================================
  if (settings.sayaçHedef) {
    const mevcut = guild.memberCount;
    const hedef = settings.sayaçHedef;
    const kalan = hedef - mevcut;
    const yuzde = Math.floor((mevcut / hedef) * 100);

    // Görsel İlerleme Çubuğu (Giden Üye Versiyonu)
    const progress = "🟥".repeat(Math.floor(yuzde / 10)) + "⬜".repeat(10 - Math.floor(yuzde / 10));

    const goodbyeEmbed = new EmbedBuilder()
      .setColor("#FF4136") // Canlı Kırmızı
      .setAuthor({ name: `${user.tag} Aramızdan Ayrıldı`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(
        `👋 **Güle Güle ${user.username}!**\n\n` +
        `⏱️ **Sunucuda Kalma Süresi:** \`${durationText}\`\n` +
        `📅 **Katılım Tarihi:** <t:${Math.floor(joinDate / 1000)}:R>\n\n` +
        `📊 **Güncel Hedef Durumu:**\n` +
        `\`${mevcut}\` / \`${hedef}\` üye (Hedefe **${kalan}** kişi kaldı)\n` +
        `**İlerleme:** [${yuzde}%]\n\`${progress}\``
      )
      .setFooter({ text: `GraveOS İstatistik Sistemi • Toplam ${mevcut} Kişiyiz` })
      .setTimestamp();

    // Kanal Belirleme (Sayaç kanalı yoksa sistem kanalına gönderir)
    const kanal = settings.sayaçKanal 
      ? guild.channels.cache.get(settings.sayaçKanal) 
      : guild.systemChannel;

    if (kanal?.permissionsFor(guild.members.me).has('SendMessages')) {
      kanal.send({ embeds: [goodbyeEmbed] });
    }
  }

  // =========================================================
  // 3. MODERASYON LOG (OPSİYONEL)
  // =========================================================
  // Eğer sunucuda bir genel log kanalı varsa, üyeyi kimin attığını veya 
  // sadece çıktığını oraya sessizce bildirebilirsin.
  if (settings.modLog) {
    const logKanal = guild.channels.cache.get(settings.modLog);
    if (logKanal) {
      const logEmbed = new EmbedBuilder()
        .setColor("#3d3d3d")
        .setDescription(`📤 **Bir kullanıcı sunucudan ayrıldı.**`)
        .addFields(
          { name: "Kullanıcı", value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: "Toplam Üye", value: `\`${guild.memberCount}\``, inline: true }
        )
        .setTimestamp();
      logKanal.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }
};
