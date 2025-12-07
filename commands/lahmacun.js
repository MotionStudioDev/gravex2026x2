const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const path = require("path");

module.exports.run = async (client, message, args) => {
  const userId = message.author.id;

  // Malzemeler
  const choices = {
    limon: { emoji: "🍋", label: "Limon", added: false },
    domates: { emoji: "🍅", label: "Domates", added: false },
    sogan: { emoji: "🧅", label: "Soğan", added: false },
    maydonoz: { emoji: "🌿", label: "Maydanoz", added: false },
    biber: { emoji: "🌶️", label: "Biber", added: false }
  };

  const LAHMACUN_IMAGE_PATH = path.join(process.cwd(), "assets", "lahmacun.png");
  const LAHMACUN_IMAGE_NAME = "lahmacun.png";

  // Embed oluşturma
  const getLahmacunEmbed = (currentChoices, status = "Siparişiniz Bekleniyor...", color = "Orange") => {
    const addedIngredients = Object.values(currentChoices)
      .filter(item => item.added)
      .map(item => item.emoji + " " + item.label)
      .join(", ");

    const description = addedIngredients
      ? `Lahmacununda şu an: **${addedIngredients}** var. 🤤\n\n`
      : `Henüz hiçbir şey eklemedin. Başla! 🚀\n\n`;

    return new EmbedBuilder()
      .setColor(color)
      .setTitle("🌯 Lahmacun Siparişi")
      .setDescription(description + "Malzemeleri seç, sonra 'Siparişi Onayla' butonuna tıkla.")
      .addFields({ name: "Durum", value: `\`${status}\`` })
      .setImage(`attachment://${LAHMACUN_IMAGE_NAME}`)
      .setFooter({ text: "60 saniye içinde seçim yapmalısın." });
  };

  // Butonlar
  const getLahmacunButtons = (currentChoices, disabled = false) => {
    const row = new ActionRowBuilder();
    for (const key in currentChoices) {
      const item = currentChoices[key];
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`lahmacun_${key}`)
          .setLabel(item.label)
          .setEmoji(item.emoji)
          .setStyle(item.added ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(disabled)
      );
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("lahmacun_onay")
        .setLabel("✅ Siparişi Onayla")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("lahmacun_iptal")
        .setLabel("❌ İptal Et")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    );
    return row;
  };

  // Başlangıç mesajı
  const msg = await message.channel.send({
    embeds: [getLahmacunEmbed(choices)],
    components: [getLahmacunButtons(choices)],
    files: [{ attachment: LAHMACUN_IMAGE_PATH, name: LAHMACUN_IMAGE_NAME }]
  });

  // Collector
  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === userId && i.customId.startsWith("lahmacun_"),
    time: 60000,
    componentType: ComponentType.Button
  });

  collector.on("collect", async i => {
    await i.deferUpdate();

    if (i.customId === "lahmacun_onay") {
      collector.stop("onaylandı");
      return;
    }
    if (i.customId === "lahmacun_iptal") {
      collector.stop("iptal");
      return;
    }

    // Malzeme seçimi
    const key = i.customId.replace("lahmacun_", "");
    if (choices[key]) {
      choices[key].added = !choices[key].added;
    }

    await msg.edit({
      embeds: [getLahmacunEmbed(choices)],
      components: [getLahmacunButtons(choices)],
      files: [{ attachment: LAHMACUN_IMAGE_PATH, name: LAHMACUN_IMAGE_NAME }]
    });
  });

  collector.on("end", async (collected, reason) => {
    let finalEmbed;
    if (reason === "onaylandı") {
      const selected = Object.values(choices)
        .filter(item => item.added)
        .map(item => item.label)
        .join(", ") || "Sade (hiçbir şey)";
      finalEmbed = getLahmacunEmbed(choices, `Siparişiniz onaylandı! İçerik: ${selected}`, "Green")
        .setTitle("🎉 Lahmacun Hazır!");
    } else if (reason === "iptal") {
      finalEmbed = getLahmacunEmbed(choices, "Sipariş iptal edildi.", "Red")
        .setTitle("❌ Lahmacun İptal");
    } else if (reason === "time") {
      finalEmbed = getLahmacunEmbed(choices, "Süre doldu, sipariş iptal edildi.", "Red")
        .setTitle("⌛ Süre Doldu");
    }

    await msg.edit({
      embeds: [finalEmbed],
      components: [getLahmacunButtons(choices, true)],
      files: [{ attachment: LAHMACUN_IMAGE_PATH, name: LAHMACUN_IMAGE_NAME }]
    }).catch(() => {});
  });
};

module.exports.conf = { aliases: ["lahmacun"] };
module.exports.help = { name: "lahmacun" };
