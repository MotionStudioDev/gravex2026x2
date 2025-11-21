const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  const settings = await GuildSettings.findOne({ guildId: message.guild.id });
  if (!settings || !settings.kayıtAktif) {
    return message.reply("❌ Bu sunucuda kayıt sistemi aktif değil.");
  }

  // Yetkili kontrolü
  if (!settings.yetkiliRol || !message.member.roles.cache.has(settings.yetkiliRol)) {
    return message.reply("❌ Bu komutu sadece kayıt yetkilileri kullanabilir.");
  }

  const uye = message.mentions.members.first();
  if (!uye) return message.reply("❌ Bir üye etiketlemelisin.");

  const isim = args[1] || "Belirtilmedi";
  const yas = args[2] || "Belirtilmedi";

  const embed = new EmbedBuilder()
    .setColor(0x1E90FF)
    .setTitle("📋 Kayıt İşlemi")
    .setDescription(
      `👤 Üye: ${uye}\n` +
      `📛 İsim: ${isim}\n` +
      `🎂 Yaş: ${yas}\n\n` +
      "Cinsiyet seçimi için aşağıdaki butonları kullanın."
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("kızKayit").setLabel("👩 Kız").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("erkekKayit").setLabel("👨 Erkek").setStyle(ButtonStyle.Secondary)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });
  const collector = msg.createMessageComponentCollector({ time: 30000 });

  collector.on('collect', async i => {
    if (!settings.yetkiliRol || !i.member.roles.cache.has(settings.yetkiliRol)) {
      return i.reply({ content: "❌ Bu butonu sadece kayıt yetkilileri kullanabilir.", ephemeral: true });
    }

    if (i.customId === "kızKayit") {
      if (settings.kızRol) await uye.roles.add(settings.kızRol);
      const done = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle("✅ Kayıt Tamamlandı")
        .setDescription(`${uye} başarıyla **Kız** olarak kayıt edildi.\nİsim: ${isim} | Yaş: ${yas}`)
        .setTimestamp();
      await i.update({ embeds: [done], components: [] });

      if (settings.kayıtKanal) {
        const kanal = message.guild.channels.cache.get(settings.kayıtKanal);
        if (kanal) kanal.send({ embeds: [done] });
      }
    }

    if (i.customId === "erkekKayit") {
      if (settings.erkekRol) await uye.roles.add(settings.erkekRol);
      const done = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle("✅ Kayıt Tamamlandı")
        .setDescription(`${uye} başarıyla **Erkek** olarak kayıt edildi.\nİsim: ${isim} | Yaş: ${yas}`)
        .setTimestamp();
      await i.update({ embeds: [done], components: [] });

      if (settings.kayıtKanal) {
        const kanal = message.guild.channels.cache.get(settings.kayıtKanal);
        if (kanal) kanal.send({ embeds: [done] });
      }
    }
  });
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'kayıt', description: 'Üyeyi kayıt eder (isim/yaş isteğe bağlı, cinsiyet butonlu).' };
