const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");
const GuildSettings = require("../models/GuildSettings");

module.exports.run = async (client, message) => {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("<a:uyar1:1416526541030035530> Yetki Yok")
          .setDescription("Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.")
      ]
    });
  }

  const settings = await GuildSettings.findOne({ guildId: message.guild.id });

  // Eğer sistem zaten aktifse → kapatma butonu göster
  if (settings?.capsLockEngel) {
    const activeEmbed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("<:tik1:1416526332803809401> Caps-Lock Sistemi Aktif")
      .setDescription("Büyük harf kullanımı bu sunucuda yasaklanmış durumda.");

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("caps_close")
        .setLabel("Sistemi Kapat")
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [activeEmbed], components: [closeRow] });
    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on("collect", async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
      }
      if (i.customId === "caps_close") {
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor("Orange")
              .setTitle("<a:yukle:1440677432976867448> Sistem kapatılıyor...")
              .setDescription("Lütfen bekle!")
          ],
          components: []
        });

        await GuildSettings.findOneAndUpdate(
          { guildId: message.guild.id },
          { capsLockEngel: false }
        );

        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("<:x_:1416529392955555871> Caps-Lock Sistemi Kapatıldı")
              .setDescription("Artık bu sunucuda büyük harf kullanımı serbest.")
          ]
        });
      }
    });

    collector.on("end", async () => {
      try {
        if (!msg.deleted) await msg.edit({ components: [] });
      } catch {}
    });

    return;
  }

  // Sistem kapalıysa → açma prompt'u
  const promptEmbed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle("<a:uyar1:1416526541030035530> Dikkat")
    .setDescription("Caps-Lock sistemini aktif etmek üzeresin. Onaylıyor musun?");

  const promptRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("caps_yes").setLabel("Evet Aç").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("caps_no").setLabel("Hayır").setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [promptEmbed], components: [promptRow] });
  const collector = msg.createMessageComponentCollector({ time: 15000 });

  collector.on("collect", async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: "Bu butonları sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    if (i.customId === "caps_yes") {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("Orange")
            .setTitle("<a:yukle:1440677432976867448> Caps-Lock Açılıyor...")
            .setDescription("Lütfen bekle!")
        ],
        components: []
      });

      await GuildSettings.findOneAndUpdate(
        { guildId: message.guild.id },
        { capsLockEngel: true },
        { upsert: true }
      );

      const activeEmbed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("<:tik1:1416526332803809401> Sistem Aktif Edildi")
        .setDescription("Büyük harf kullanımı bu sunucuda yasaklandı.");

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("caps_close")
          .setLabel("Sistemi Kapat")
          .setStyle(ButtonStyle.Danger)
      );

      await msg.edit({ embeds: [activeEmbed], components: [closeRow] });
    }

    if (i.customId === "caps_no") {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("<:x_:1416529392955555871> İşleminiz İptal Edildi")
            .setDescription("Caps-Lock sistemi açılmadı.")
        ],
        components: []
      });
    }

    if (i.customId === "caps_close") {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("Orange")
            .setTitle("<a:yukle:1440677432976867448> Sistem kapatılıyor...")
            .setDescription("Lütfen bekle!")
        ],
        components: []
      });

      await GuildSettings.findOneAndUpdate(
        { guildId: message.guild.id },
        { capsLockEngel: false }
      );

      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("<:x_:1416529392955555871> Caps-Lock Sistemi Kapatıldı")
            .setDescription("Artık bu sunucuda büyük harf kullanımı serbest.")
        ]
      });
    }
  });

  collector.on("end", async () => {
    try {
      if (!msg.deleted) await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = { aliases: ["capslock", "caps"] };
module.exports.help = { name: "caps-lock", description: "Caps-Lock sistemini aç/kapat." };
