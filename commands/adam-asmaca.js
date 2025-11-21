const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const Skor = require('../models/Skor');

module.exports.run = async (client, message, args) => {
  try {
    // Rastgele kelime listesi
    const kelimeListesi = [
      "İZMİR","ANKARA","KEDİ","KÖPEK","BİLGİSAYAR","ARABA","UÇAK","DENİZ","DAĞ",
      "COPILOT","DISCORD","OYUN","TÜRKİYE","EGE","ÇİĞLİ","KİTAP","KALEM","MÜZİK","FUTBOL"
    ];
    const kelime = kelimeListesi[Math.floor(Math.random() * kelimeListesi.length)].toUpperCase();

    let tahmin = Array(kelime.length).fill("_");
    let yanlis = [];
    let kalanHak = 6;

    // Canvas ile adam çizimi
    function cizAdam(hak) {
      const canvas = createCanvas(200, 200);
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = 'black'; ctx.lineWidth = 3;

      // Direk
      ctx.beginPath();
      ctx.moveTo(20,180); ctx.lineTo(180,180);
      ctx.moveTo(50,180); ctx.lineTo(50,20);
      ctx.lineTo(120,20); ctx.lineTo(120,40);
      ctx.stroke();

      // Adam parçaları
      if (hak <= 5) { ctx.beginPath(); ctx.arc(120,55,15,0,Math.PI*2); ctx.stroke(); }
      if (hak <= 4) { ctx.beginPath(); ctx.moveTo(120,70); ctx.lineTo(120,110); ctx.stroke(); }
      if (hak <= 3) { ctx.beginPath(); ctx.moveTo(120,80); ctx.lineTo(100,100); ctx.stroke(); }
      if (hak <= 2) { ctx.beginPath(); ctx.moveTo(120,80); ctx.lineTo(140,100); ctx.stroke(); }
      if (hak <= 1) { ctx.beginPath(); ctx.moveTo(120,110); ctx.lineTo(100,140); ctx.stroke(); }
      if (hak <= 0) { ctx.beginPath(); ctx.moveTo(120,110); ctx.lineTo(140,140); ctx.stroke(); }

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

    // Alfabe iki menüye bölünüyor (max 25 seçenek kuralı)
    const alfabe = "ABCDEFGHIJKLMNOPQRSTUVWXYZÇĞİÖŞÜ".split("");
    const options1 = alfabe.slice(0, 25).map(harf => ({ label: harf, value: harf }));
    const options2 = alfabe.slice(25).map(harf => ({ label: harf, value: harf }));

    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('harfSec1')
        .setPlaceholder('Bir harf seç (A–Y)...')
        .addOptions(options1)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('harfSec2')
        .setPlaceholder('Bir harf seç (Z + Türkçe)...')
        .addOptions(options2)
    );

    const msg = await message.channel.send({ ...generateEmbed(), components: [row1, row2] });
    const collector = msg.createMessageComponentCollector({ time: 120_000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'Bu oyunu sadece komutu kullanan kişi oynayabilir.', ephemeral: true });
      }

      const harf = interaction.values[0];
      if (kelime.includes(harf)) {
        kelime.split("").forEach((h, i) => { if (h === harf) tahmin[i] = harf; });
      } else {
        if (!yanlis.includes(harf)) { yanlis.push(harf); kalanHak--; }
      }

      if (!tahmin.includes("_")) collector.stop("kazandi");
      else if (kalanHak <= 0) collector.stop("kaybetti");

      await interaction.update({ ...generateEmbed(), components: [row1, row2] });
    });

    collector.on('end', async (collected, reason) => {
      let finalEmbed;
      if (reason === "kazandi") {
        finalEmbed = new EmbedBuilder().setColor(0x00FF7F).setTitle("🎉 Kazandın!").setDescription(`Kelime: **${kelime}**`);
        await Skor.findOneAndUpdate(
          { userId: message.author.id },
          { $inc: { kazan: 1 } },
          { upsert: true }
        );
      } else if (reason === "kaybetti") {
        finalEmbed = new EmbedBuilder().setColor(0xFF0000).setTitle("💀 Kaybettin!").setDescription(`Doğru kelime: **${kelime}**`);
        await Skor.findOneAndUpdate(
          { userId: message.author.id },
          { $inc: { kaybet: 1 } },
          { upsert: true }
        );
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
module.exports.help = { name: 'adam', description: 'Canvas + Select Menu (iki menü) + MongoDB puanlı Adam Asmaca oyunu.' };
