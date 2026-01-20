const { EmbedBuilder, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
const moment = require('moment');
require('moment/locale/tr');

module.exports = async (member) => {
  const { client, guild, user } = member;
  const guildId = guild.id;

  // 1. VERİTABANI KONTROLÜ
  const settings = await GuildSettings.findOne({ guildId });
  if (!settings) return;

  // --- ANALİZ BİRİMİ: HESAP GÜVENLİK DURUMU ---
  const accountAge = Date.now() - user.createdTimestamp;
  const sevenDays = 1000 * 60 * 60 * 24 * 7;
  const isSuspect = accountAge < sevenDays; // 7 günden yeni hesaplar şüpheli
  const securityStatus = isSuspect ? "⚠️ Şüpheli (Yeni Hesap)" : "✅ Güvenli";
  const securityColor = isSuspect ? "#FF4136" : "#2ECC40";

  // =========================================================
  // 2. BOT KORUMA & LOG SİSTEMİ
  // =========================================================
  if (user.bot) {
    const botLog = settings.modLog ? guild.channels.cache.get(settings.modLog) : null;
    if (botLog) {
      const botEmbed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🤖 Yeni Bot Katıldı")
        .setDescription(`${user} (\`${user.id}\`) sunucuya eklendi.`)
        .setTimestamp();
      botLog.send({ embeds: [botEmbed] });
    }
    // Botlara özel rol varsa ver (opsiyonel geliştirme alanı)
    return; // Botlar için aşağıdaki süreçleri (kayıt vs.) çalıştırma
  }

  // =========================================================
  // 3. GELİŞMİŞ KAYIT SİSTEMİ (WELCOME UI)
  // =========================================================
  if (settings.kayıtAktif && settings.kayıtKanal) {
    const kanal = guild.channels.cache.get(settings.kayıtKanal);
    if (kanal?.permissionsFor(guild.members.me).has('SendMessages')) {
      
      const welcomeEmbed = new EmbedBuilder()
        .setColor(isSuspect ? "Red" : "Blue")
        .setAuthor({ name: `${guild.name} Hoş Geldin!`, iconURL: guild.iconURL() })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(
          `🚀 **Aramıza Hoş Geldin ${member}!**\n\n` +
          `🆔 **Kullanıcı ID:** \`${member.id}\`\n` +
          `🗓️ **Hesap Kuruluş:** <t:${Math.floor(user.createdTimestamp / 1000)}:D> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)\n` +
          `🛡️ **Güvenlik Analizi:** \`${securityStatus}\`\n\n` +
          `📢 **Kayıt Bilgi:** \`g!kayıt\` komutunu kullanarak sunucumuza erişim sağlayabilirsin.`
        )
        .addFields({ name: '📝 Kayıt Talimatı', value: "Lütfen yetkilileri bekleyin veya kayıt odasına geçiş yapın." })
        .setFooter({ text: `Seninle beraber ${guild.memberCount} kişiyiz!` })
        .setTimestamp();

      kanal.send({ content: isSuspect ? `⚠️ ${member} Hesabın çok yeni, dikkatli ol!` : `🎉 Hoş geldin ${member}!`, embeds: [welcomeEmbed] });
    }
  }

  // =========================================================
  // 4. OTOROL SİSTEMİ (DENETİMLİ)
  // =========================================================
  if (settings.otorol) {
    const rol = guild.roles.cache.get(settings.otorol);
    const logKanal = settings.otorolLog ? guild.channels.cache.get(settings.otorolLog) : guild.systemChannel;

    if (rol) {
      // Botun rol yetkisini kontrol et
      if (guild.members.me.roles.highest.position <= rol.position) {
        if (logKanal) {
          logKanal.send({ embeds: [new EmbedBuilder().setColor("Red").setDescription(`❌ **Otorol Hatası:** \`${rol.name}\` rolü benim rolümden üstte olduğu için veremiyorum!`)] });
        }
      } else {
        try {
          await member.roles.add(rol);
          if (logKanal?.permissionsFor(guild.members.me).has('SendMessages')) {
            const otoEmbed = new EmbedBuilder()
              .setColor("#2ECC40")
              .setAuthor({ name: "GraveOS Otorol", iconURL: client.user.displayAvatarURL() })
              .setDescription(`✅ ${member} kullanıcısına **${rol.name}** rolü başarıyla tanımlandı.`)
              .setTimestamp();
            logKanal.send({ embeds: [otoEmbed] });
          }
        } catch (err) {
          console.error("Otorol Hatası:", err);
        }
      }
    }
  }

  // =========================================================
  // 5. AKILLI SAYAÇ SİSTEMİ (PROGRESS BAR)
  // =========================================================
  if (settings.sayaçHedef) {
    const mevcut = guild.memberCount;
    const hedef = settings.sayaçHedef;
    const kalan = hedef - mevcut;
    const yuzde = Math.floor((mevcut / hedef) * 100);

    // Basit bir ilerleme çubuğu (Progress Bar)
    const progress = "🟩".repeat(Math.floor(yuzde / 10)) + "⬜".repeat(10 - Math.floor(yuzde / 10));

    const sayacEmbed = new EmbedBuilder()
      .setColor(kalan <= 0 ? "Gold" : "#3498db")
      .setTitle("📊 Sayaç Durumu")
      .setDescription(
        `👤 **Üye:** ${user.tag}\n` +
        `🎯 **Hedef:** \`${hedef}\`\n` +
        `👥 **Mevcut:** \`${mevcut}\`\n` +
        `📉 **Kalan:** \`${kalan > 0 ? kalan : "Hedefe ulaşıldı!"}\`\n\n` +
        `**İlerleme:** [${yuzde}%]\n\`${progress}\``
      )
      .setFooter({ text: "GraveOS Sayaç Sistemi" });

    const kanal = settings.sayaçKanal ? guild.channels.cache.get(settings.sayaçKanal) : guild.systemChannel;
    if (kanal?.permissionsFor(guild.members.me).has('SendMessages')) {
      kanal.send({ embeds: [sayacEmbed] });

      if (kalan <= 0) {
        kanal.send({ content: "🎊 **TEBRİKLER!** Sunucumuz hedeflenen üye sayısına ulaştı! @everyone" });
        settings.sayaçHedef = null; // Hedefe ulaşınca sıfırla
        await settings.save();
      }
    }
  }

  // =========================================================
  // 6. ANTI-RAID ENGINE (SÜPER KORUMA)
  // =========================================================
  if (settings.antiRaidAktif) {
    if (!client.antiRaidGirişler) client.antiRaidGirişler = new Map();
    
    const simdi = Date.now();
    const girisler = client.antiRaidGirişler.get(guildId) || [];
    const sonGirisler = [...girisler, simdi].filter(t => simdi - t <= settings.antiRaidSüre * 1000);
    client.antiRaidGirişler.set(guildId, sonGirisler);

    if (sonGirisler.length >= settings.antiRaidEşik) {
      // Raid tespit edildiğinde yapılacak ek aksiyonlar buraya gelebilir (Kanalları kilitleme vb.)
      const logKanal = settings.antiRaidLog ? guild.channels.cache.get(settings.antiRaidLog) : null;
      if (logKanal) {
        const raidAlert = new EmbedBuilder()
          .setColor("DarkRed")
          .setTitle("🚨 RAID TEHLİKESİ ANALİZ EDİLDİ")
          .setDescription(`Sunucuya ani giriş tespiti yapıldı!`)
          .addFields(
            { name: 'Süre', value: `\`${settings.antiRaidSüre} saniye\``, inline: true },
            { name: 'Giriş Sayısı', value: `\`${sonGirisler.length} kullanıcı\``, inline: true },
            { name: 'Durum', value: `🔴 **Kritik - İzlemeye Alındı**`, inline: false }
          )
          .setFooter({ text: "Anti-Raid Koruma Devrede" })
          .setTimestamp();
        
        logKanal.send({ embeds: [raidAlert] });
      }
      // Hafızayı temizle ki her girişte spam yapmasın
      client.antiRaidGirişler.set(guildId, []);
    }
  }
};
