const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

module.exports.run = async (client, message, args) => {
  const latency = Date.now() - message.createdTimestamp;
  const apiPing = Math.round(client.ws.ping);

  // Canvas boyutu
  const canvas = createCanvas(600, 250);
  const ctx = canvas.getContext("2d");

  // Arkaplan
  ctx.fillStyle = "#23272A";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Başlık
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 28px Sans";
  ctx.fillText("📡 Ping Verileri", 30, 50);

  // Mesaj gecikmesi
  ctx.font = "24px Sans";
  ctx.fillStyle = "#00FF99";
  ctx.fillText(`Mesaj Gecikmesi: ${latency} ms`, 30, 100);

  // API ping
  ctx.fillStyle = "#00BFFF";
  ctx.fillText(`Bot Ping (API): ${apiPing} ms`, 30, 140);

  // Zaman
  ctx.fillStyle = "#AAAAAA";
  ctx.font = "20px Sans";
  ctx.fillText(`Zaman: ${new Date().toLocaleTimeString("tr-TR")}`, 30, 190);

  // Talep eden
  ctx.fillStyle = "#888888";
  ctx.font = "18px Sans";
  ctx.fillText(`Talep: ${message.author.tag}`, 30, 220);

  // Görseli gönder
  const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "ping.png" });
  message.channel.send({ files: [attachment] });
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: "ping"
};
