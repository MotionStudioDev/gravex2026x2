const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  const settings = await GuildSettings.findOne({ guildId: message.guild.id });
  if (!settings || !settings.kayıtAktif) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle("❌ Kayıt Sistemi Kapalı")
      .setDescription("Bu sunucuda kayıt sistemi aktif değil.")
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  if (!settings.yetkiliRol || !message.member.roles.cache.has(settings.yetkiliRol)) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle("❌ Yetki Yok")
      .setDescription("Bu komutu sadece kayıt yetkilileri kullanabilir.")
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  // ✅ Üye mention veya ID ile çek
  let uye = message.mentions.members.first();
  if (!uye && args[0]) {
    uye = await message.guild.members.fetch(args[0]).catch(() => null);
  }

  if (!uye) {
    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle("❌ Hatalı Kullanım")
      .setDescription("Bir üye etiketlemelisin veya ID girmelisin.")
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  const isim = args[1] || "Belirtilmedi";
  const yas = args[2] || "Belirtilmedi";

  const embed = new EmbedBuilder()
    .setColor(0x1E90FF)
    .setTitle("📋 Kayıt İşlemi")
    .setDescription(`👤 Üye: ${uye}\n🆔 ID: ${uye.id}\n📛 İsim: ${isim}\n🎂 Yaş: ${yas}\n\nCinsiyet seçimi için aşağıdaki butonları kullanın.`)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("kızKayit").setLabel("👩 Kız").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("erkekKayit").setLabel("👨 Erkek").setStyle(ButtonStyle.Secondary)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });
  const collector = msg.createMessageComponentCollector({ time: 30000 });

  collector.on('collect', async i => {
    if (!settings.yetkiliRol || !i.member.roles.cache.has(settings.yetkiliRol)) {
      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle("❌ Yetki Yok")
        .setDescription("Bu butonu sadece kayıt yetkilileri kullanabilir.")
        .setTimestamp();
      return i.reply({ embeds: [embed], ephemeral: true });
    }

    let cinsiyet = null;

    if (i.customId === "kızKayit") {
      if (settings.kızRol) await uye.roles.add(settings.kızRol);
      await uye.setNickname(`${isim} | ${yas}`).catch(() => {});
      cinsiyet = "Kız";
      const done = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle("✅ Kayıt Tamamlandı")
        .setDescription(`${uye} başarıyla **Kız** olarak kayıt edildi.\n🆔 ID: ${uye.id}\nİsim: ${isim}  |  Yaş: ${yas}`)
        .setTimestamp();
      await i.update({ embeds: [done], components: [] });
    }

    if (i.customId === "erkekKayit") {
      if (settings.erkekRol) await uye.roles.add(settings.erkekRol);
      await uye.setNickname(`${isim} | ${yas}`).catch(() => {});
      cinsiyet = "Erkek";
      const done = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle("✅ Kayıt Tamamlandı")
        .setDescription(`${uye} başarıyla **Erkek** olarak kayıt edildi.\n🆔 ID: ${uye.id}\nİsim: ${isim}  |  Yaş: ${yas}`)
        .setTimestamp();
      await i.update({ embeds: [done], components: [] });
    }

    // ✅ DB'ye kaydet
    if (cinsiyet) {
      if (!settings.kayıtlıÜyeler) settings.kayıtlıÜyeler = [];
      settings.kayıtlıÜyeler.push({
        userId: uye.id,
        isim,
        yas,
        cinsiyet
      });
      await settings.save();
    }
  });
};

module.exports.conf = { aliases: [] };
module.exports.help = { 
  name: 'kayıt', 
  description: 'Üyeyi kayıt eder (mention veya ID ile, isim/yaş isteğe bağlı, cinsiyet butonlu, DB kaydı).' 
};
