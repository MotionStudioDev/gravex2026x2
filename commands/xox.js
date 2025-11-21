const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Skor = require('../models/Skor');

module.exports.run = async (client, message, args) => {
  const rakip = message.mentions.users.first();
  if (!rakip || rakip.bot || rakip.id === message.author.id) {
    return message.reply("Geçerli bir rakip etiketle (bot olmasın, kendin olmasın).");
  }

  const oyuncular = [message.author.id, rakip.id];
  let sira = 0;
  let tahta = Array(9).fill(null);

  const kazananKontrol = () => {
    const setler = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const [a,b,c] of setler) {
      if (tahta[a] && tahta[a] === tahta[b] && tahta[a] === tahta[c]) return tahta[a];
    }
    return tahta.includes(null) ? null : "berabere";
  };

  const tahtaGoster = () => {
    const rows = [new ActionRowBuilder(), new ActionRowBuilder(), new ActionRowBuilder()];
    for (let i = 0; i < 9; i++) {
      const btn = new ButtonBuilder()
        .setCustomId(i.toString())
        .setLabel(tahta[i] || " ")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!!tahta[i]);
      rows[Math.floor(i / 3)].addComponents(btn);
    }
    return rows;
  };

  const embed = new EmbedBuilder()
    .setColor(0x1E90FF)
    .setTitle("🎯 XOX Oyunu")
    .setDescription(`Sıra: <@${oyuncular[sira]}> (${sira === 0 ? "❌" : "⭕"})`);

  const msg = await message.channel.send({ embeds: [embed], components: tahtaGoster() });
  const collector = msg.createMessageComponentCollector({ time: 120_000 });

  collector.on('collect', async i => {
    if (i.user.id !== oyuncular[sira]) {
      return i.reply({ content: "Sıra sende değil!", ephemeral: true });
    }

    const index = parseInt(i.customId);
    tahta[index] = sira === 0 ? "❌" : "⭕";
    const sonuc = kazananKontrol();

    if (sonuc) {
      collector.stop();
      let bitis;
      if (sonuc === "berabere") {
        bitis = new EmbedBuilder()
          .setColor(0x808080)
          .setTitle("🎯 XOX Oyunu Bitti")
          .setDescription("Berabere!");
      } else {
        const kazananId = oyuncular[sonuc === "❌" ? 0 : 1];
        const kaybedenId = oyuncular[sonuc === "❌" ? 1 : 0];

        await Skor.findOneAndUpdate(
          { userId: kazananId },
          { $inc: { kazan: 1 } },
          { upsert: true }
        );
        await Skor.findOneAndUpdate(
          { userId: kaybedenId },
          { $inc: { kaybet: 1 } },
          { upsert: true }
        );

        bitis = new EmbedBuilder()
          .setColor(0x00FF7F)
          .setTitle("🎯 XOX Oyunu Bitti")
          .setDescription(`Kazanan: <@${kazananId}> (${sonuc})`);
      }

      return await i.update({ embeds: [bitis], components: tahtaGoster() });
    }

    sira = 1 - sira;
    const yeniEmbed = new EmbedBuilder()
      .setColor(0x1E90FF)
      .setTitle("🎯 XOX Oyunu")
      .setDescription(`Sıra: <@${oyuncular[sira]}> (${sira === 0 ? "❌" : "⭕"})`);

    await i.update({ embeds: [yeniEmbed], components: tahtaGoster() });
  });

  collector.on('end', async () => {
    const embed = new EmbedBuilder()
      .setColor(0x808080)
      .setTitle("⏰ Süre Doldu")
      .setDescription("Oyun zaman aşımına uğradı.");
    await msg.edit({ embeds: [embed], components: [] });
  });
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'xox', description: '2 kişilik butonlu XOX oyunu (MongoDB puanlı).' };
