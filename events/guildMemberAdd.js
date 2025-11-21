const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = async (member) => {
  const client = member.client;
  const guildId = member.guild.id;
  const user = member.user;

  // Sunucu ayarlarını DB’den çek
  const settings = await GuildSettings.findOne({ guildId });
  if (!settings) return;

  // ✅ KAYIT SİSTEMİ (dokunmadım)
  if (settings.kayıtAktif && settings.kayıtKanal) {
    const kanal = member.guild.channels.cache.get(settings.kayıtKanal);
    if (kanal?.permissionsFor(member.guild.members.me).has('SendMessages')) {
      const embed = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle("📥 Yeni Üye Katıldı")
        .setDescription(
          `👤 Üye: ${member}\n` +
          `🆔 ID: ${member.id}\n` +
          `📅 Hesap Açılış: <t:${Math.floor(user.createdTimestamp / 1000)}:R>\n\n` +
          "Kayıt için `g!kayıt @üye İsim Yaş` komutunu kullanın."
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Kayıt sistemi' })
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
                .setTitle('✅ Otorol Verildi')
                .setDescription(`${member} kullanıcısına <@&${rol.id}> rolü verildi.`)
                .setFooter({ text: 'Otorol sistemi' })
            ]
          });
        }
      } catch (err) {
        if (logKanal?.permissionsFor(member.guild.members.me).has('SendMessages')) {
          logKanal.send({
            embeds: [
              new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Otorol Verilemedi')
                .setDescription(`**${user.tag}** için <@&${rol.id}> rolü verilemedi.\nHata: \`Missing Permissions\``)
                .setFooter({ text: 'Otorol sistemi' })
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
      .setTitle('👤 Yeni Üye Katıldı')
      .setDescription(`**${user.tag}** aramıza katıldı!\nHedefe ulaşmak için **${kalan}** kişi kaldı.`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Sayaç sistemi' });

    const kanal = settings.sayaçKanal
      ? member.guild.channels.cache.get(settings.sayaçKanal)
      : member.guild.systemChannel;

    if (kanal?.permissionsFor(member.guild.members.me).has('SendMessages')) {
      kanal.send({ embeds: [embed] });
    }

    if (kalan <= 0) {
      const kutlama = new EmbedBuilder()
        .setColor('Gold')
        .setTitle('🎉 Sayaç Tamamlandı!')
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
        .setTitle('🚨 Raid Algılandı')
        .setDescription(`**${settings.antiRaidSüre} saniye** içinde **${yeniGirişler.length}** kişi sunucuya katıldı.`)
        .addFields({ name: 'Zaman', value: `<t:${Math.floor(now / 1000)}:F>`, inline: false })
        .setFooter({ text: 'Anti-Raid sistemi' });

      if (logKanal?.permissionsFor(member.guild.members.me).has('SendMessages')) {
        logKanal.send({ embeds: [raidEmbed] });
      }

      client.antiRaidGirişler.set(guildId, []);
    }
  }
};
