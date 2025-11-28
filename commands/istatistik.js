const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const os = require("os");
const moment = require("moment");
require("moment-duration-format");

module.exports.run = async (client, message) => {
  const generateEmbed = async () => {
    const uptime = moment
      .duration(client.uptime)
      .format("D [gün], H [saat], m [dakika], s [saniye]");

    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const apiPing = Math.round(client.ws.ping);

    const totalGuilds = client.guilds.cache.size;

    // 🔑 Shardlı gerçek kullanıcı sayısı
    let totalUsers;
    if (client.shard) {
      try {
        const results = await client.shard.broadcastEval(c =>
          c.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)
        );
        totalUsers = results.reduce((acc, val) => acc + val, 0);
      } catch {
        totalUsers = "Shard bilgisi alınamadı";
      }
    } else {
      totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    }

    return new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("📊 Grave İstatistikleri")
      .addFields(
        { name: "Ping", value: `${apiPing}ms`, inline: true },
        { name: "Uptime", value: uptime, inline: true },
        { name: "Sunucu Sayısı", value: `${totalGuilds}`, inline: true },
        { name: "Kullanıcı Sayısı", value: `${totalUsers}`, inline: true },
        { name: "RAM Kullanımı", value: `${memoryUsage} MB`, inline: true },
        { name: "Node.js", value: process.version, inline: true },
        { name: "discord.js", value: `v${require("discord.js").version}`, inline: true }
      )
      .setFooter({ text: "GraveBOT 2026" });
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("yenile")
      .setLabel("🔄 Verileri Yenile")
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({ embeds: [await generateEmbed()], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 60000
  });

  collector.on("collect", async i => {
    if (i.customId === "yenile") {
      await i.update({ embeds: [await generateEmbed()], components: [row] });
    }
  });

  collector.on("end", async () => {
    try {
      const disabledRow = new ActionRowBuilder().addComponents(
        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );
      await msg.edit({ components: [disabledRow] });
    } catch {}
  });
};

module.exports.conf = { aliases: ["botbilgi", "bilgi"] };
module.exports.help = { name: "istatistik" };
