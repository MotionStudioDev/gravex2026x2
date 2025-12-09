const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
// ⬇️ SON GÖRÜLME MODELİNİ İÇERİ AL
const LastSeen = require('../models/sonGorulme'); // Dosya yolunun doğru olduğundan emin olun!
// ⬆️ SON GÖRÜLME MODELİNİ İÇERİ AL

module.exports = async (member) => {
  const client = member.client;
  const guildId = member.guild.id;
  const user = member.user;

  // Sunucu ayarlarını DB’den çek
  const settings = await GuildSettings.findOne({ guildId });
  if (!settings) return;

  // 👑 SON GÖRÜLME (LAST SEEN) KAYDI ENTEGRASYONU
  try {
      await LastSeen.findOneAndUpdate(
          { guildID: guildId, userID: user.id },
          { $set: { lastJoin: Date.now() } }, // Son giriş zamanını kaydet
          { upsert: true, new: true } // Veri yoksa oluştur, varsa güncelle
      );
      // console.log(`${user.tag} sunucuya giriş yaptı, lastJoin güncellendi.`);
  } catch (error) {
      console.error("Giriş verisi güncellenirken hata oluştu:", error);
  }
  // 👑 SON GÖRÜLME (LAST SEEN) KAYDI BİTİŞ

  // ✅ KAYIT SİSTEMİ (dokunmadım)
  if (settings.kayıtAktif && settings.kayıtKanal) {
    const kanal = member.guild.channels.cache.get(settings.kayıtKanal);
    if (kanal?.permissionsFor(member.guild.members.me).has('SendMessages')) {
      const embed = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle("<a:giris:1416530113989705959> Yeni Üye Katıldı")
        .setDescription(
          `<:userx:1441379546929561650> Üye: ${member}\n` +
          `<:ID:1416530654006349967> ID: ${member.id}\n` +
          `<a:takvm:1445125311850090618> Hesap Açılış: <t:${Math.floor(user.createdTimestamp / 1000)}:R>\n\n` +
          "<:ok1:1445126670687404143> Kayıt için `g!kayıt @üye İsim Yaş` komutunu kullanın."
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Grave Kayıt sistemi' })
        .setTimestamp();

      kanal.send({ embeds: [embed] });
    }
  }

  // ✅ OTO-ROL SİSTEMİ
  if (settings.otorol) {
    const rol = member.guild.roles.cache.get(settings.otorol);
    if (rol) {
      const logKanal = settings.otorolLog
        ? member.guild.channels.cache.get(settings.otorolLog)
        : member.guild.systemChannel;
      try {
        await member.roles.add(rol);
        if (logKanal?.permissionsFor(member.guild.members.me).has('SendMessages')) {
          logKanal.send({
            embeds: [
              new EmbedBuilder()
                .setColor('Green')
                .setTitle('<:tik33:1445123298139574353> Otorol Verildi')
                .setDescription(`${member} kullanıcısına <@&${rol.id}> rolü verildi.`)
                .setFooter({ text: 'Grave Otorol sistemi' })
            ]
          });
        }
      } catch (err) {
        if (logKanal?.permissionsFor(member.guild.members.me).has('SendMessages')) {
          logKanal.send({
            embeds: [
              new EmbedBuilder()
                .setColor('Red')
                .setTitle('<a:uyar1:1416526541030035530> Otorol Verilemedi')
                .setDescription(`**${user.tag}** için <@&${rol.id}> rolü verilemedi.\nHata: \`Missing Permissions\``)
                .setFooter({ text: 'Grave Otorol sistemi' })
            ]
          });
        }
        console.error('Otorol verilemedi:', err);
      }
    }
  }

  // ✅ SAYAÇ SİSTEMİ
  if (settings.sayaçHedef) {
    const mevcut = member.guild.memberCount;
    const kalan = settings.sayaçHedef - mevcut;

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('<:userx:1441379546929561650> Yeni Üye Katıldı')
      .setDescription(`**${user.tag}** aramıza katıldı!\nHedefe ulaşmak için **${kalan}** kişi kaldı.`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Grave Sayaç sistemi' });

    const kanal = settings.sayaçKanal
      ? member.guild.channels.cache.get(settings.sayaçKanal)
      : member.guild.systemChannel;

    if (kanal?.permissionsFor(member.guild.members.me).has('SendMessages')) {
      kanal.send({ embeds: [embed] });
    }

    if (kalan <= 0) {
      const kutlama = new EmbedBuilder()
        .setColor('Gold')
        .setTitle('<:tik33:1445123298139574353> Sayaç Tamamlandı!')
        .setDescription(`Sunucumuz **${settings.sayaçHedef}** üyeye ulaştı!\nHoş geldin ${user}, seni aramızda görmek harika!`);

      kanal?.send({ embeds: [kutlama] });

      // Sayaç sıfırlama
      settings.sayaçHedef = null;
      settings.sayaçKanal = null;
      await settings.save();
    }
  }

  // ✅ ANTI-RAID SİSTEMİ
  if (settings.antiRaidAktif) {
    const now = Date.now();
    if (!client.antiRaidGirişler) client.antiRaidGirişler = new Map();
    const girişler = client.antiRaidGirişler.get(guildId) || [];
    const yeniGirişler = [...girişler, now].filter(t => now - t <= settings.antiRaidSüre * 1000);
    client.antiRaidGirişler.set(guildId, yeniGirişler);

    if (yeniGirişler.length >= settings.antiRaidEşik) {
      const logKanal = settings.antiRaidLog
        ? member.guild.channels.cache.get(settings.antiRaidLog)
        : null;

      const raidEmbed = new EmbedBuilder()
        .setColor('DarkRed')
        .setTitle('<a:uyar2:1416526724182835282> Raid Algılandı')
        .setDescription(`**${settings.antiRaidSüre} saniye** içinde **${yeniGirişler.length}** kişi sunucuya katıldı.`)
        .addFields({ name: 'Zaman', value: `<t:${Math.floor(now / 1000)}:F>`, inline: false })
        .setFooter({ text: 'Grave Anti-Raid sistemi' });

      if (logKanal?.permissionsFor(member.guild.members.me).has('SendMessages')) {
        logKanal.send({ embeds: [raidEmbed] });
      }

      client.antiRaidGirişler.set(guildId, []);
    }
  }
};
