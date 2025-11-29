const express = require("express");
const bodyParser = require("body-parser");
const { EmbedBuilder } = require("discord.js");
const Vote = require("./models/Vote"); // MongoDB modeli

// Senin verdiğin API key
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfdCI6Ijc4MjY0ODgwMjkyMzQ3MDg0OCIsImlkIjoiNTM5NzU2MzExOTU3ODc2NzM2IiwiaWF0IjoxNzY0NDM0ODE1fQ.sjAOkc8MvAvETuKpQPhL3n-5R3jLDJuG-GEN9CdNtZM";

module.exports = (client) => {
  const app = express();
  app.use(bodyParser.json());

  app.post("/dblwebhook", async (req, res) => {
    // Authorization kontrolü
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== API_KEY) {
      return res.sendStatus(403); // yetkisiz erişim
    }

    const { user } = req.body; // top.gg gönderdiği user ID
    const guild = client.guilds.cache.get("1408511083232362547");
    const member = await guild.members.fetch(user).catch(() => null);

    // DB kaydı
    await new Vote({
      userId: user,
      username: member ? member.user.username : "Bilinmiyor"
    }).save();

    // Log embed
    const logEmbed = new EmbedBuilder()
      .setColor("Purple")
      .setTitle("🗳️ Yeni Oy Geldi!")
      .setDescription(`**${member ? member.user.username : user}** bot için oy verdi!`)
      .setFooter({ text: "Top.gg Oy Sistemi" })
      .setTimestamp();

    const logChannel = client.channels.cache.get("1441478539391275108");
    if (logChannel) logChannel.send({ embeds: [logEmbed] });

    // DM gönder
    if (member) {
      try {
        await member.send({
          embeds: [new EmbedBuilder()
            .setColor("Green")
            .setTitle("🎉 Oy İçin Teşekkürler!")
            .setDescription("Botumuza oy verdiğin için teşekkür ederiz!\nOy geçmişin kaydedildi.")
            .setFooter({ text: "GraveBOT • top.gg" })]
        });
      } catch (err) {
        console.log("DM gönderilemedi:", err);
      }
    }

    res.sendStatus(200);
  });

  app.listen(3000, () => console.log("Oy log sistemi aktif!"));
};
