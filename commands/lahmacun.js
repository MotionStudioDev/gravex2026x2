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

  const ingredientMap = {
    la_limon: "🍋 Limon Sıkıldı",
    la_domates: "🍅 Domates",
    la_soğan: "🧅 Soğan",
    la_maydonoz: "🌿 Maydanoz",
    la_biber: "🌶️ Biber"
  };

  let selectedIngredients = [];

  const LAHMACUN_IMAGE_PATH = path.join(process.cwd(), "assets", "lahmacun.png");
  const LAHMACUN_IMAGE_NAME = "lahmacun.png";

  const createEmbed = (status = "Siparişiniz Bekleniyor...", color = "Orange") => {
    const ingredientsText = selectedIngredients.length > 0
      ? selectedIngredients.join(", ")
      : "Hiçbir şey seçilmedi.";

    return new EmbedBuilder()
      .setColor(color)
      .setTitle("🌯 Lahmacun Siparişi")
      .setDescription(`**${message.author.username}**, lahmacununun yanına neleri istersin?`)
      .addFields(
        { name: "Seçilen Malzemeler:", value: ingredientsText },
        { name: "Durum:", value: `\`${status}\`` },
        { name: "Hazırlayan:", value: `${message.author}` }
      )
      .setTimestamp();
  };

  const createButtons = (disabled = false) => {
    const ingredientButtons = Object.keys(ingredientMap).map(id => {
      const label = ingredientMap[id];
      const isSelected = selectedIngredients.includes(label);

      return new ButtonBuilder()
        .setCustomId(id)
        .setLabel(label.split(" ")[1])
        .setStyle(isSelected ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(disabled);
    });

    const controlButtons = [
      new ButtonBuilder()
        .setCustomId("la_siparis_onay")
        .setLabel("✅ Siparişi Ver")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("la_siparis_iptal")
        .setLabel("❌ Siparişi İptal Et")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    ];

    const row1 = new ActionRowBuilder().addComponents(ingredientButtons.slice(0, 4));
    const row2 = new ActionRowBuilder().addComponents(ingredientButtons.slice(4)).addComponents(controlButtons);

    return [row1, row2];
  };

  const msg = await message.channel.send({
    embeds: [createEmbed()],
    components: createButtons()
  });

  const filter = i => i.user.id === userId && i.customId.startsWith("la_");
  const collector = msg.createMessageComponentCollector({
    filter,
    time: 60000,
    componentType: ComponentType.Button
  });

  collector.on("collect", async interaction => {
    await interaction.deferUpdate();
    const customId = interaction.customId;

    if (ingredientMap[customId]) {
      const label = ingredientMap[customId];
      if (selectedIngredients.includes(label)) {
        selectedIngredients = selectedIngredients.filter(item => item !== label);
      } else {
        selectedIngredients.push(label);
      }

      await msg.edit({
        embeds: [createEmbed()],
        components: createButtons()
      });
    } else if (customId === "la_siparis_onay") {
      collector.stop("onaylandı");
    } else if (customId === "la_siparis_iptal") {
      collector.stop("iptal edildi");
    }
  });

  collector.on("end", async (_, reason) => {
    let finalEmbed;

    if (reason === "onaylandı") {
      const content = selectedIngredients.length > 0
        ? selectedIngredients.join(", ")
        : "Sade (Hiçbir şey)";
      finalEmbed = createEmbed(`Siparişiniz yolda! İçerik: ${content}`, "Green")
        .setTitle("🎉 Lahmacun Siparişi Onaylandı!")
        .setImage(`attachment://${LAHMACUN_IMAGE_NAME}`);
    } else if (reason === "iptal edildi") {
      finalEmbed = createEmbed("Sipariş kullanıcı tarafından iptal edildi.", "Red")
        .setTitle("❌ Lahmacun Siparişi İptal Edildi");
    } else {
      finalEmbed = createEmbed("Süre doldu, sipariş otomatik olarak iptal edildi.", "Red")
        .setTitle("⌛ Süre Doldu");
    }

    await msg.edit({
      embeds: [finalEmbed],
      components: createButtons(true),
      files: reason === "onaylandı"
        ? [{ attachment: LAHMACUN_IMAGE_PATH, name: LAHMACUN_IMAGE_NAME }]
        : []
    }).catch(() => {});
  });
};

module.exports.conf = { aliases: ["lahmacun"] };
module.exports.help = { name: "lahmacun" };
