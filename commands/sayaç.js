const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Yetki Yok')
          .setDescription('Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.')
      ]
    });
  }

  const sub = args[0]?.toLowerCase();
  const guildId = message.guild.id;

  if (!sub || !['ayarla', 'göster', 'sıfırla', 'kanal'].includes(sub)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Orange')
          .setTitle('ℹ️ Sayaç Komutu')
          .setDescription(
            "Kullanım:\n" +
            "`g!sayaç ayarla <sayı>`\n" +
            "`g!sayaç göster`\n" +
            "`g!sayaç sıfırla`\n" +
            "`g!sayaç kanal <#kanal>`"
          )
      ]
    });
  }

  // ✅ Ayarla
  if (sub === 'ayarla') {
    const hedef = parseInt(args[1]);
    const mevcut = message.guild.memberCount;

    if (!hedef || isNaN(hedef) || hedef <= mevcut) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Geçersiz Hedef')
            .setDescription(`Lütfen geçerli bir sayı gir. Mevcut üye sayısından büyük olmalı.\nSunucudaki üye sayısı: **${mevcut}**`)
        ]
      });
    }

    await GuildSettings.findOneAndUpdate(
      { guildId },
      { sayaçHedef: hedef },
      { upsert: true }
    );

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Sayaç Ayarlandı')
          .setDescription(`Hedef üye sayısı başarıyla ayarlandı: **${hedef}**`)
      ]
    });
  }

  // ✅ Göster
  if (sub === 'göster') {
    const settings = await GuildSettings.findOne({ guildId });
    const hedef = settings?.sayaçHedef;
    const mevcut = message.guild.memberCount;

    if (!hedef) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Orange')
            .setTitle('ℹ️ Sayaç Ayarlanmamış')
            .setDescription('Henüz sayaç hedefi belirlenmemiş.\n`g!sayaç ayarla <sayı>` ile ayarlayabilirsin.')
        ]
      });
    }

    const kalan = hedef - mevcut;

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('📊 Sayaç Durumu')
          .addFields(
            { name: 'Mevcut Üye Sayısı', value: `${mevcut}`, inline: true },
            { name: 'Hedef', value: `${hedef}`, inline: true },
            { name: 'Kalan', value: `${kalan > 0 ? kalan : 'Tamamlandı!'}`, inline: true }
          )
          .setFooter({ text: 'Sayaç sistemi' })
      ]
    });
  }

  // ✅ Sıfırla
  if (sub === 'sıfırla') {
    const settings = await GuildSettings.findOne({ guildId });
    if (!settings?.sayaçHedef) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Orange')
            .setTitle('ℹ️ Sayaç Zaten Ayarlanmamış')
            .setDescription('Sıfırlanacak sayaç hedefi bulunamadı.')
        ]
      });
    }

    await GuildSettings.findOneAndUpdate(
      { guildId },
      { sayaçHedef: null, sayaçKanal: null }
    );

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Sayaç Sıfırlandı')
          .setDescription('Sayaç hedefi ve kanal bilgisi kaldırıldı.')
      ]
    });
  }

  // ✅ Kanal
  if (sub === 'kanal') {
    const kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
    if (!kanal || kanal.type !== 0) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Geçersiz Kanal')
            .setDescription('Lütfen geçerli bir metin kanalı etiketle veya ID gir.\nÖrnek: `g!sayaç kanal #genel`')
        ]
      });
    }

    await GuildSettings.findOneAndUpdate(
      { guildId },
      { sayaçKanal: kanal.id },
      { upsert: true }
    );

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Sayaç Kanalı Ayarlandı')
          .setDescription(`Sayaç bilgileri artık <#${kanal.id}> kanalına gönderilecek.`)
      ]
    });
  }
};

module.exports.conf = { aliases: ['sayac'] };
module.exports.help = { name: 'sayaç', description: 'Sunucuda sayaç sistemini yönetir.' };
