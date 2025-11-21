const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports.run = async (client, message, args) => {
  const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
  if (!guildConfig || !guildConfig.kayıtAktif) {
    return message.reply("❌ Bu sunucuda kayıt sistemi aktif değil.");
  }

  if (!message.member.roles.cache.has(guildConfig.yetkiliRol)) {
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
      `Üye: ${uye}\nİsim: ${isim}\nYaş: ${yas}\n\nCinsiyet seçimi için aşağıdaki butonları kullanın.`
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("kızKayit").setLabel("👩 Kız").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("erkekKayit").setLabel("👨 Erkek").setStyle(ButtonStyle.Secondary)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });
  const collector = msg.createMessageComponentCollector({ time: 30000 });

  collector.on('collect', async i => {
    if (!i.member.roles.cache.has(guildConfig.yetkiliRol)) {
      return i.reply({ content: "❌ Bu butonu sadece kayıt yetkilileri kullanabilir.", ephemeral: true });
    }

    if (i.customId === "kızKayit") {
      await uye.roles.add(guildConfig.kızRol);
      const done = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle("✅ Kayıt Tamamlandı")
        .setDescription(`${uye} başarıyla **Kız** olarak kayıt edildi.\nİsim: ${isim} | Yaş: ${yas}`)
        .setTimestamp();
      await i.update({ embeds: [done], components: [] });
      if (guildConfig.kayıtKanal) {
        const kanal = message.guild.channels.cache.get(guildConfig.kayıtKanal);
        if (kanal) kanal.send({ embeds: [done] });
      }
    }

    if (i.customId === "erkekKayit") {
      await uye.roles.add(guildConfig.erkekRol);
      const done = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle("✅ Kayıt Tamamlandı")
        .setDescription(`${uye} başarıyla **Erkek** olarak kayıt edildi.\nİsim: ${isim} | Yaş: ${yas}`)
        .setTimestamp();
      await i.update({ embeds: [done], components: [] });
      if (guildConfig.kayıtKanal) {
        const kanal = message.guild.channels.cache.get(guildConfig.kayıtKanal);
        if (kanal) kanal.send({ embeds: [done] });
      }
    }
  });
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'kayıt', description: 'Üyeyi kayıt eder (isim/yaş iste' };
