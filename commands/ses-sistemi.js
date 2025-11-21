const { EmbedBuilder, ChannelType } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  const sub = args[0]?.toLowerCase();
  const hedef = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
  const guildId = message.guild.id;
  const bot = message.guild.members.me;

  if (!sub || !['çek', 'git', 'log', 'durum', 'çek-hepsini'].includes(sub)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Orange')
          .setTitle('ℹ️ Ses Sistemi Komutu')
          .setDescription(
            'Kullanım:\n`g!ses-sistemi çek <@kişi>`\n`g!ses-sistemi git <@kişi>`\n`g!ses-sistemi çek-hepsini`\n`g!ses-sistemi log <#kanal>`\n`g!ses-sistemi durum`'
          )
      ]
    });
  }

  // Sunucu ayarını bul veya oluştur
  let settings = await GuildSettings.findOne({ guildId });
  if (!settings) settings = new GuildSettings({ guildId });

  // ✅ LOG AYARLAMA
  if (sub === 'log') {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('🚫 Yetki Yok').setDescription('Log kanalını ayarlamak için `Yönetici` yetkisine sahip olmalısın.')]
      });
    }

    const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
    if (!kanal || kanal.type !== ChannelType.GuildText) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Geçersiz Kanal').setDescription('Lütfen geçerli bir metin kanalı etiketle veya ID gir.')]
      });
    }

    settings.sesLog = kanal.id;
    await settings.save();

    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Log Kanalı Ayarlandı').setDescription(`Ses sistemi logları artık <#${kanal.id}> kanalına gönderilecek.`)]
    });
  }

  // ✅ DURUM
  if (sub === 'durum') {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('🚫 Yetki Yok').setDescription('Sistem durumunu görüntülemek için `Yönetici` yetkisine sahip olmalısın.')]
      });
    }

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('🔍 Ses Sistemi Durumu')
          .addFields({ name: 'Log Kanalı', value: settings.sesLog ? `<#${settings.sesLog}>` : 'Ayarlanmamış', inline: true })
      ]
    });
  }

  // ✅ BOT YETKİ KONTROLÜ
  if (!bot.permissions.has('MoveMembers')) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Yetki Eksik').setDescription('Botun `Üyeleri Taşı` yetkisi yok.')]
    });
  }

  // ✅ ÇEK
  if (sub === 'çek') {
    const kanalım = message.member.voice?.channel;
    if (!kanalım) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('🚫 Ses Kanalı Gerekli').setDescription('Bu komutu kullanmak için bir ses kanalında olmalısın.')] });
    }

    if (!hedef || !hedef.voice?.channel) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Kullanıcı Sesli Değil').setDescription('Etiketlediğin kişi bir ses kanalında değil.')] });
    }

    try {
      await hedef.voice.setChannel(kanalım);

      const logKanal = settings.sesLog ? message.guild.channels.cache.get(settings.sesLog) : null;
      if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
        logKanal.send({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('📥 Sesli Çekildi')
              .addFields(
                { name: 'Kim?', value: `${hedef} (${hedef.id})`, inline: true },
                { name: 'Nereye?', value: `<#${kanalım.id}>`, inline: true },
                { name: 'Çeken', value: `${message.author}`, inline: false }
              )
              .setFooter({ text: 'Ses sistemi' })
          ]
        });
      }

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Çekildi').setDescription(`${hedef} kullanıcısı senin kanalına çekildi.`)] });
    } catch (err) {
      console.error('Çek hatası:', err);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Taşıma Başarısız').setDescription('Kullanıcıyı taşıyamadım. Yetki veya sistem hatası olabilir.')] });
    }
  }

  // ✅ GİT
  if (sub === 'git') {
    if (!hedef || !hedef.voice?.channel) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Kullanıcı Sesli Değil').setDescription('Etiketlediğin kişi bir ses kanalında değil.')] });
    }

    if (!message.member.voice?.channel) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('🚫 Sen Seslide Değilsin').setDescription('Bu komutu kullanmak için önce bir ses kanalına girmen gerek.')] });
    }

    try {
      await message.member.voice.setChannel(hedef.voice.channel);

      const logKanal = settings.sesLog ? message.guild.channels.cache.get(settings.sesLog) : null;
      if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
        logKanal.send({
          embeds: [
            new EmbedBuilder()
              .setColor('Blue')
              .setTitle('📤 Sesliye Gidildi')
              .addFields(
                { name: 'Kim?', value: `${message.author} (${message.author.id})`, inline: true },
                { name: 'Kime?', value: `${hedef} (${hedef.id})`, inline: true },
                { name: 'Hedef Kanal', value: `<#${hedef.voice.channel.id}>`, inline: false }
              )
              .setFooter({ text: 'Ses sistemi' })
          ]
        });
      }

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Blue').setTitle('✅ Gidildi').setDescription(`Artık ${hedef} kullanıcısının kanalındasın.`)] });
    } catch (err) {
      console.error('Git hatası:', err);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Taşıma Başarısız').setDescription('Kendini taşıyamadım. Yetki veya sistem hatası olabilir.')] });
    }
  }

    // ✅ ÇEK-HEPSİNİ
  if (sub === 'çek-hepsini') {
    const kanalım = message.member.voice?.channel;
    if (!kanalım) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('🚫 Ses Kanalı Gerekli')
            .setDescription('Bu komutu kullanmak için bir ses kanalında olmalısın.')
        ]
      });
    }

    const taşınacaklar = message.guild.members.cache.filter(m =>
      m.voice?.channel && m.voice.channel.id !== kanalım.id && !m.user.bot
    );

    if (taşınacaklar.size === 0) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Orange')
            .setTitle('ℹ️ Kimse Yok')
            .setDescription('Taşınacak başka sesli kullanıcı yok.')
        ]
      });
    }

    let başarı = 0;
    for (const member of taşınacaklar.values()) {
      try {
        await member.voice.setChannel(kanalım);
        başarı++;
      } catch (err) {
        console.warn(`Taşıma hatası: ${member.user.tag}`, err);
      }
    }

    const logKanal = settings.sesLog ? message.guild.channels.cache.get(settings.sesLog) : null;
    if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
      logKanal.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('📥 Toplu Sesli Çekim')
            .addFields(
              { name: 'Çeken', value: `${message.author}`, inline: true },
              { name: 'Kanal', value: `<#${kanalım.id}>`, inline: true },
              { name: 'Toplam Taşınan', value: `${başarı} kişi`, inline: true }
            )
            .setFooter({ text: 'Ses sistemi' })
        ]
      });
    }

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Toplu Çekildi')
          .setDescription(`${başarı} kişi kanalına çekildi.`)
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['ses']
};

module.exports.help = {
  name: 'ses-sistemi'
};
