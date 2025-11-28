const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fetch = require("node-fetch");

module.exports.run = async (client, message) => {
  try {
    // API key'i .env'den çekiyoruz
    const apiKey = process.env.NEWSAPI_KEY;

    // Türkiye gündeminden son haberleri çek
    const res = await fetch(`https://newsapi.org/v2/top-headlines?country=tr&pageSize=10&apiKey=${apiKey}`);
    const data = await res.json();

    if (!data.articles || data.articles.length === 0) {
      return message.reply("⚠️ Güncel haber bulunamadı.");
    }

    // Haberleri embed sayfalarına böl
    const pages = data.articles.map((article, index) =>
      new EmbedBuilder()
        .setColor("Blurple")
        .setTitle(`📰 Türkiye Gündemi - Haber ${index + 1}`)
        .setDescription(`**${article.title}**\n\n${article.description || "Detay yok."}`)
        .setURL(article.url)
        .setFooter({ text: "Kaynak: " + (article.source?.name || "Bilinmiyor") })
    );

    let page = 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("◀").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("home").setLabel("🏠").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("next").setLabel("▶").setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({ embeds: [pages[page]], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 120000
    });

    collector.on("collect", async i => {
      if (i.customId === "prev") page = page > 0 ? page - 1 : pages.length - 1;
      if (i.customId === "next") page = page < pages.length - 1 ? page + 1 : 0;
      if (i.customId === "home") page = 0;

      await i.update({ embeds: [pages[page]], components: [row] });
    });

    collector.on("end", async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
        await msg.edit({ components: [disabledRow] });
      } catch {}
    });
  } catch (err) {
    console.error("Haberler komutu hatası:", err);
    message.channel.send("⚠️ | Haberler menüsü oluşturulurken bir hata oluştu.");
  }
};

module.exports.conf = { aliases: ["haber", "news"] };
module.exports.help = { name: "haberler" };
