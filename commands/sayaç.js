const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has('Administrator')) {
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

  if (!sub || !['ayarla', 'göster', 'sıfırla'].includes(sub)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Orange')
          .setTitle('ℹ️ Sayaç Komutu')
          .setDescription('Kullanım:\n`g!sayaç ayarla <sayı>`\n`g!sayaç göster`\n`g!sayaç sıfırla`')
      ]
    });
  }

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

    client.sayaçlar.set(guildId, hedef);

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Sayaç Ayarlandı')
          .setDescription(`Hedef üye sayısı başarıyla ayarlandı: **${hedef}**`)
      ]
    });
  }

  if (sub === 'göster') {
    const hedef = client.sayaçlar.get(guildId);
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

  if (sub === 'sıfırla') {
    if (!client.sayaçlar.has(guildId)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Orange')
            .setTitle('ℹ️ Sayaç Zaten Ayarlanmamış')
            .setDescription('Sıfırlanacak sayaç hedefi bulunamadı.')
        ]
      });
    }

    client.sayaçlar.delete(guildId);

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Sayaç Sıfırlandı')
          .setDescription('Sayaç hedefi başarıyla kaldırıldı.')
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['sayac']
};

module.exports.help = {
  name: 'sayaç'
};
