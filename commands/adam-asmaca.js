const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');

module.exports.run = async (client, message, args) => {
  try {
    const kelimeListesi = ["İZMİR", "ANKARA", "KEDİ", "KÖPEK", "BİLGİSAYAR", "ARABA"];
    const kelime = kelimeListesi[Math.floor(Math.random() * kelimeListesi.length)].toUpperCase();

    let tahmin = Array(kelime.length).fill("_");
    let yanlis = [];
    let kalanHak = 6;

    // Adam çizimi (Canvas)
    function cizAdam(hak) {
      const canvas = createCanvas(200, 200);
      const ctx = canvas.getContext('2d');

      // Direk
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, 180); ctx.lineTo(180, 180); // taban
      ctx.moveTo(50, 180); ctx.lineTo(50, 20);   // dikey
      ctx.lineTo(120, 20);                       // üst
      ctx.lineTo(120, 40);                       // ip
      ctx.stroke();

      // Adam parçaları
      if (hak <= 5) { ctx.beginPath(); ctx.arc(120, 55, 15, 0, Math.PI * 2); ctx.stroke(); } // kafa
      if (hak <= 4) { ctx.beginPath(); ctx.moveTo(120, 70); ctx.lineTo(120, 110); ctx.stroke(); } // gövde
      if (hak <= 3) { ctx.beginPath(); ctx.moveTo(120, 80); ctx.lineTo(100, 100); ctx.stroke(); } // sol kol
      if (hak <= 2) { ctx.beginPath(); ctx.moveTo(120, 80); ctx.lineTo(140, 100); ctx.stroke(); } // sağ kol
      if (hak <= 1) { ctx.beginPath(); ctx.moveTo(120, 110); ctx.lineTo(100, 140); ctx.stroke(); } // sol bacak
      if (hak <= 0) { ctx.beginPath(); ctx.moveTo(120, 110); ctx.lineTo(140, 140); ctx.stroke(); } // sağ bacak

      return new AttachmentBuilder(canvas.toBuffer(), { name: 'adam.png' });
    }

    const generateEmbed = () => {
      const attachment = cizAdam(kalanHak);
      return {
        embeds: [
          new EmbedBuilder()
            .setColor(kalanHak > 2 ? 0x00FF7F : 0xFF4500)
            .setTitle("🎮 Adam Asmaca")
            .setDescription(
              `Kelime: ${tahmin.join(" ")}\n\n` +
              `Yanlış Harfler: ${yanlis.join(", ") || "Yok"}\n` +
              `Kalan Hak: ${kalanHak}`
            )
            .setImage('attachment://adam.png')
            .setFooter({ text: `Sadece ${message.author.username} oynayabilir` })
            .setTimestamp()
        ],
        files: [attachment]
      };
    };

    // Alfabe butonları
    const alfabe = "ABCDEFGHIJKLMNOPQRSTUVWXYZÇĞİÖŞÜ".split("");
    const rows = [];
    for (let i = 0; i < alfabe.length; i += 5) {
      const row = new ActionRowBuilder();
      alfabe.slice(i, i + 5).forEach(harf => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(harf)
            .setLabel(harf)
            .setStyle(ButtonStyle.Secondary)
        );
      });
      rows.push(row);
    }

    const msg = await message.channel.send({ ...generateEmbed(), components: rows });

    const collector = msg.createMessageComponentCollector({ time: 120_000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'Bu oyunu sadece komutu kullanan kişi oynayabilir.', ephemeral: true });
      }

      const harf = interaction.customId;
      if (kelime.includes(harf)) {
        kelime.split("").forEach((h, i) => {
          if (h === harf) tahmin[i] = harf;
        });
      } else {
        if (!yanlis.includes(harf)) {
          yanlis.push(harf);
          kalanHak--;
        }
      }

      if (!tahmin.includes("_")) collector.stop("kazandi");
      else if (kalanHak <= 0) collector.stop("kaybetti");

      await interaction.update({ ...generateEmbed(), components: rows });
    });

    collector.on('end', async (collected, reason) => {
      let finalEmbed;
      if (reason === "kazandi") {
        finalEmbed = new EmbedBuilder().setColor(0x00FF7F).setTitle("🎉 Kazandın!").setDescription(`Kelime: **${kelime}**`);
      } else if (reason === "kaybetti") {
        finalEmbed = new EmbedBuilder().setColor(0xFF0000).setTitle("💀 Kaybettin!").setDescription(`Doğru kelime: **${kelime}**`);
      } else {
        finalEmbed = new EmbedBuilder().setColor(0x808080).setTitle("⏰ Süre Doldu").setDescription(`Doğru kelime: **${kelime}**`);
      }
      await msg.edit({ embeds: [finalEmbed], components: [] });
    });

  } catch (error) {
    console.error("Adam asmaca hatası:", error);
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle("❌ Hata")
      .setDescription("Adam asmaca oyunu başlatılırken bir hata oluştu.")
      .setTimestamp();
    await message.channel.send({ embeds: [embed] });
  }
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'adam-asmaca', description: 'Canvas ile resimli Adam Asmaca oyunu oynatır.' };
