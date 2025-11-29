const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has("ManageMessages")) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("<a:uyar1:1416526541030035530> Yetki Yok")
          .setDescription("Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın.")
      ]
    });
  }

  const miktar = parseInt(args[0]);
  if (isNaN(miktar) || miktar < 1 || miktar > 100) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("<:x2:1441372015343697941> Hatalı Kullanım")
          .setDescription("Lütfen 1 ile 100 arasında bir sayı gir.\nÖrnek: `g!temizle 25`")
      ]
    });
  }

  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle("<a:uyar1:1416526541030035530> Temizleme Onayı")
    .setDescription(`Bu kanaldan **${miktar}** mesaj silinecek.\nOnaylıyorsan **EVET**, iptal için **HAYIR** bas.`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("evet").setLabel("EVET").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("hayir").setLabel("HAYIR").setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 15000
  });

  collector.on("collect", async i => {
    if (i.customId === "evet") {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("Orange")
            .setTitle("<a:yukle:1440677432976867448> İşlem Başlatıldı")
            .setDescription("Mesajlar siliniyor, bekle!")
        ],
        components: []
      });

      try {
        const deleted = await message.channel.bulkDelete(miktar, true);

        // Collector mesajı silindiyse yeni mesaj gönder
        if (deleted.has(msg.id)) {
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setTitle("<:tik1:1416526332803809401> Temizleme Başarılı")
                .setDescription(`Toplam **${deleted.size}** mesaj silindi.`)
            ]
          });
        }

        // Collector mesajı duruyorsa edit et
        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("Green")
              .setTitle("<:tik1:1416526332803809401> Temizleme Başarılı")
              .setDescription(`Toplam **${deleted.size}** mesaj silindi.`)
          ]
        });
      } catch (err) {
        console.error("Temizle hatası:", err);
        try {
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setTitle("<:x2:1441372015343697941> Hata")
                .setDescription("Mesajlar silinirken bir hata oluştu.")
            ]
          });
        } catch {
          await message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setTitle("<:x2:1441372015343697941> Hata")
                .setDescription("Mesajlar silinirken bir hata oluştu.")
            ]
          });
        }
      }

      collector.stop();
    }

    if (i.customId === "hayir") {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("<:x2:1441372015343697941> İptal")
            .setDescription("Mesaj temizleme işlemi iptal edildi!")
        ],
        components: []
      });
      collector.stop();
    }
  });

  collector.on("end", async () => {
    try {
      if (!msg.deleted) await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = {
  aliases: ["clear", "sil"]
};

module.exports.help = {
  name: "temizle"
};
