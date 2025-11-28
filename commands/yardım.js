const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

module.exports.run = async (client, message) => {
  try {
    // Ping durumu
    const ping = client.ws.ping;
    let pingEmoji = "🟢";
    if (ping > 200) pingEmoji = "🔴";
    else if (ping > 100) pingEmoji = "🟡";

    const pages = [
      new EmbedBuilder()
        .setColor("Blurple")
        .setTitle("Grave Yardım Menüsü")
        .setDescription(
          `Prefix: \`g!\`\n\n**Merhaba, Lütfen kategoriden menü seçiniz.**\n\n **Anlık Ping:** ${pingEmoji} **${ping}ms**`
        )
        .setFooter({ text: "GraveBOT 2026" }),

      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("<a:discord:1441131310717599886> | Genel Komutlar")
        .setDescription(
          "`ping`,`istatistik`,`uptime`,`hatırlat`,`hata-bildir`,`yardım`\n\n📡 Şu anki ping: " +
            pingEmoji +
            ` **${ping}ms**`
        ),

      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("<:user:1441128594117099664> | Kullanıcı Komutları")
        .setDescription(
          "`avatar`,`profil`,`deprem`,`döviz`,`çeviri`,`emoji-bilgi`,`emojiler`"
        ),

      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("<:gvenlik:1416529478112383047> | Moderasyon")
        .setDescription(
          "`ban`,`kick`,`sil`,`rol-ver`,`rol-al`,`temizle`,`lock`,`kanalsil`,`kanalekle`,`uyar`"
        ),

      new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("<a:sistemx:1441130022340399124> | Sistem")
        .setDescription(
          "`sayaç`,`reklam-engel`,`level-sistemi`,`küfür-engel`,`anti-raid`,`jail-sistemi`,`kayıt-sistemi`,`otorol`,`sa-as`,`ses-sistemi`,`slowmode`,`emoji-log`"
        ),

      new EmbedBuilder()
        .setColor(0x99aab5)
        .setTitle("<:owner:1441129983153147975> | Sahip Komutları")
        .setDescription("`reload`,`mesaj-gönder`"),

      new EmbedBuilder()
        .setColor(0xe91e63)
        .setTitle("🎉 Eğlence Komutları")
        .setDescription("`ship`,`espiri`"),
    ];

    // Dropdown menü
    const menu = new StringSelectMenuBuilder()
      .setCustomId("helpMenu")
      .setPlaceholder("Lütfen kategori seçiniz!")
      .addOptions([
        { label: "Ana Sayfa", value: "0" },
        { label: "Genel Komutlar", value: "1" },
        { label: "Kullanıcı Komutları", value: "2" },
        { label: "Moderasyon", value: "3" },
        { label: "Sistem", value: "4" },
        { label: "Sahip Komutları", value: "5" },
        { label: "Eğlence", value: "6" },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    const msg = await message.channel.send({
      embeds: [pages[0]],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "helpMenu") {
        const selected = parseInt(i.values[0]);
        await i.update({ embeds: [pages[selected]], components: [row] });
      }
    });

    collector.on("end", async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          StringSelectMenuBuilder.from(menu).setDisabled(true)
        );
        await msg.edit({ components: [disabledRow] });
      } catch {}
    });
  } catch (err) {
    console.error("Yardım komutu hatası:", err);
    message.channel.send("⚠️ | Yardım menüsü oluşturulurken bir hata oluştu.");
  }
};

module.exports.conf = { aliases: ["help", "yardim"] };
module.exports.help = { name: "yardım" };
