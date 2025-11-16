const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const moment = require('moment');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('🚫 Yetki Yok')
      .setDescription('Bu komutu kullanmak için `Üyeleri Zaman Aşımına Uğrat` yetkisine sahip olmalısın.');
    return message.channel.send({ embeds: [embed] });
  }

  const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
  const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

  if (!target) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('❌ Kullanıcı Bulunamadı')
      .setDescription('Lütfen geçerli bir kullanıcı etiketle veya ID gir.\n\n**Doğru kullanım:** `g!uyar @kullanıcı [sebep]`');
    return message.channel.send({ embeds: [embed] });
  }

  const tarih = moment().format('DD.MM.YYYY');
  const saat = moment().format('HH:mm:ss');

  const embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle('⚠️ Uyarı Verildi')
    .addFields(
      { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: false },
      { name: 'Yetkili', value: `${message.author.tag} (${message.author.id})`, inline: false },
      { name: 'Sebep', value: reason, inline: false },
      { name: 'Tarih', value: tarih, inline: true },
      { name: 'Saat', value: saat, inline: true }
    )
    .setFooter({ text: 'Grave Uyarı sistemi' });

  message.channel.send({ embeds: [embed] });

  // İsteğe bağlı: DM ile kullanıcıyı bilgilendir
  try {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Yellow')
          .setTitle('📩 Uyarı Aldınız')
          .setDescription(`**Sunucu:** ${message.guild.name}\n**Sebep:** ${reason}`)
          .setFooter({ text: 'Lütfen kurallara dikkat edin.' })
      ]
    });
  } catch (err) {
    // DM kapalıysa sessizce geç
  }

  // İsteğe bağlı: Veritabanına kayıt (örnek)
  // db.push(`uyarilar_${target.id}`, {
  //   yetkili: message.author.id,
  //   sebep: reason,
  //   tarih: Date.now()
  // });
};

module.exports.conf = {
  aliases: ['warn']
};

module.exports.help = {
  name: 'uyar'
};
