const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const sub = args[0]?.toLowerCase();
  const hedef = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
  const guildId = message.guild.id;
  const bot = message.guild.members.me;

  if (!sub || !['çek', 'git', 'log', 'durum'].includes(sub)) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Orange').setTitle('ℹ️ Ses Sistemi Komutu').setDescription('Kullanım:\n`g!ses-sistemi çek <@kişi>`\n`g!ses-sistemi git <@kişi>`\n`g!ses-sistemi log <#kanal>`\n`g!ses-sistemi durum`')]
    });
  }

  // ✅ LOG AYARLAMA
  if (sub === 'log') {
    const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
    if (!kanal || kanal.type !== 0) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Geçersiz Kanal').setDescription('Lütfen geçerli bir metin kanalı etiketle veya ID gir.')]
      });
    }

    client.sesLogKanalları.set(guildId, kanal.id);
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Log Kanalı Ayarlandı').setDescription(`Ses sistemi logları artık <#${kanal.id}> kanalına gönderilecek.`)]
    });
  }

  // ✅ DURUM GÖSTERME
  if (sub === 'durum') {
    const logKanalId = client.sesLogKanalları?.get(guildId);
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Blurple').setTitle('🔍 Ses Sistemi Durumu').addFields(
        { name: 'Log Kanalı', value: logKanalId ? `<#${logKanalId}>` : 'Ayarlanmamış', inline: true }
      )]
    });
  }

  // ✅ YETKİ KONTROL
  if (!bot.permissions.has('MoveMembers')) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Yetki Eksik').setDescription('Botun `Üyeleri Taşı` yetkisi yok.')]
    });
  }

  // ✅ ÇEK
  if (sub === 'çek') {
    const kanalım = message.member.voice?.channel;
    if (!kanalım) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('🚫 Ses Kanalı Gerekli').setDescription('Bu komutu kullanmak için bir ses kanalında olmalısın.')]
      });
    }

    if (!hedef || !hedef.voice?.channel) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Kullanıcı Sesli Değil').setDescription('Etiketlediğin kişi bir ses kanalında değil.')]
      });
    }

    try {
      await hedef.voice.setChannel(kanalım);

      const logKanalId = client.sesLogKanalları?.get(guildId);
      const logKanal = logKanalId ? message.guild.channels.cache.get(logKanalId) : null;

      if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
        logKanal.send({
          embeds: [new EmbedBuilder().setColor('Green').setTitle('📥 Sesli Çekildi').addFields(
            { name: 'Kim?', value: `${hedef} (${hedef.id})`, inline: true },
            { name: 'Nereye?', value: `<#${kanalım.id}>`, inline: true },
            { name: 'Çeken', value: `${message.author}`, inline: false }
          ).setFooter({ text: 'Ses sistemi' })]
        });
      }

      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Çekildi').setDescription(`${hedef} kullanıcısı senin kanalına çekildi.`)]
      });
    } catch (err) {
      console.error('Çek hatası:', err);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Taşıma Başarısız').setDescription('Kullanıcıyı taşıyamadım. Yetki veya sistem hatası olabilir.')]
      });
    }
  }

  // ✅ GİT
  if (sub === 'git') {
    if (!hedef || !hedef.voice?.channel) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Kullanıcı Sesli Değil').setDescription('Etiketlediğin kişi bir ses kanalında değil.')]
      });
    }

    if (!message.member.voice?.channel) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('🚫 Sen Seslide Değilsin').setDescription('Bu komutu kullanmak için önce bir ses kanalına girmen gerek.')]
      });
    }

    try {
      await message.member.voice.setChannel(hedef.voice.channel);

      const logKanalId = client.sesLogKanalları?.get(guildId);
      const logKanal = logKanalId ? message.guild.channels.cache.get(logKanalId) : null;

      if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
        logKanal.send({
          embeds: [new EmbedBuilder().setColor('Blue').setTitle('📤 Sesliye Gidildi').addFields(
            { name: 'Kim?', value: `${message.author} (${message.author.id})`, inline: true },
            { name: 'Kime?', value: `${hedef} (${hedef.id})`, inline: true },
            { name: 'Hedef Kanal', value: `<#${hedef.voice.channel.id}>`, inline: false }
          ).setFooter({ text: 'Ses sistemi' })]
        });
      }

      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Blue').setTitle('✅ Gidildi').setDescription(`Artık ${hedef} kullanıcısının kanalındasın.`)]
      });
    } catch (err) {
      console.error('Git hatası:', err);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Taşıma Başarısız').setDescription('Kendini taşıyamadım. Yetki veya sistem hatası olabilir.')]
      });
    }
  }
};

module.exports.conf = {
  aliases: ['ses']
};

module.exports.help = {
  name: 'ses-sistemi'
};
