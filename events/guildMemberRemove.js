const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
// ⬇️ SON GÖRÜLME MODELİNİ İÇERİ AL
const LastSeen = require('../models/sonGorulme'); // Dosya yolunun doğru olduğundan emin olun!
// ⬆️ SON GÖRÜLME MODELİNİ İÇERİ AL

module.exports = async (member) => {
  const guildId = member.guild.id;
  const client = member.client;
  const now = Date.now(); // Çıkış zamanı

  if (member.user.bot) return; // Botlar için Last Seen kaydı tutmaya gerek yok

  // --- 👑 SON GÖRÜLME (LAST SEEN) KAYDI ENTEGRASYONU ---
  try {
      // Önce kullanıcının mevcut verilerini bulalım
      const data = await LastSeen.findOne({ guildID: guildId, userID: member.user.id });

      if (data && data.lastJoin !== 0) {
          // Sunucuda geçirilen süreyi hesapla (Mevcut an - Son Giriş)
          const duration = now - data.lastJoin;

          // Veriyi güncelle: lastLeave'i ayarla, lastJoin'i sıfırla ve toplam aktiflik süresine ekle
          await LastSeen.updateOne(
              { _id: data._id },
              {
                  $set: { lastLeave: now, lastJoin: 0 }, 
                  $inc: { totalActiveDuration: duration } 
              }
          );
      } else {
           // Eğer lastJoin yoksa (örneğin bot eklenmeden önce katıldıysa), sadece lastLeave'i güncelleyelim.
           await LastSeen.findOneAndUpdate(
              { guildID: guildId, userID: member.user.id },
              { $set: { lastLeave: now, lastJoin: 0 } },
              { upsert: true }
          );
      }
  } catch (error) {
      console.error("Çıkış verisi güncellenirken hata oluştu:", error);
  }
  // --- 👑 SON GÖRÜLME (LAST SEEN) KAYDI BİTİŞİ ---


  const settings = await GuildSettings.findOne({ guildId });
  if (!settings || !settings.sayaçHedef) return;

  // ⬇️ MEVCUT SAYAÇ SİSTEMİ BAŞLANGICI

  const mevcut = member.guild.memberCount;
  const kalan = settings.sayaçHedef - mevcut;

  const embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('📉 Bir Üye Ayrıldı')
    .setDescription(`**${member.user.tag}** sunucudan ayrıldı.\nHedefe ulaşmak için **${kalan}** kişi kaldı.`)
    .setFooter({ text: 'Grave Sayaç sistemi' })
    .setTimestamp();

  const kanal = settings.sayaçKanal
    ? member.guild.channels.cache.get(settings.sayaçKanal)
    : member.guild.systemChannel;

  if (kanal && kanal.permissionsFor(member.guild.members.me).has('SendMessages')) {
    kanal.send({ embeds: [embed] });
  }
};
