const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = (client) => {
  // Bot bir sunucuya eklendiğinde
  client.on("guildCreate", async (guild) => {
    const owner = await guild.fetchOwner().catch(() => null);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("✅ Yeni Sunucuya Eklendi")
      .setThumbnail(guild.iconURL({ dynamic: true }) || null)
      .addFields(
        { name: "Sunucu Adı", value: guild.name, inline: true },
        { name: "Sunucu ID", value: guild.id, inline: true },
        { name: "Üye Sayısı", value: `${guild.memberCount}`, inline: true },
        { name: "Sahip", value: owner ? `${owner.user.tag} (${owner.id})` : "Bilinmiyor", inline: false }
      )
      .setFooter({ text: "Grave LOG Sistemleri" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Sunucuya Git")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${guild.systemChannelId || guild.channels.cache.first()?.id || ""}`)
    );

    const logChannel = client.channels.cache.get("1416358157558485022");
    if (logChannel) logChannel.send({ embeds: [embed], components: [row] });
  });

  // Bot bir sunucudan atıldığında
  client.on("guildDelete", async (guild) => {
    const owner = await guild.fetchOwner().catch(() => null);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("❌ Sunucudan Atıldım")
      .setThumbnail(guild.iconURL({ dynamic: true }) || null)
      .addFields(
        { name: "Sunucu Adı", value: guild.name || "Bilinmiyor", inline: true },
        { name: "Sunucu ID", value: guild.id, inline: true },
        { name: "Sahip", value: owner ? `${owner.user.tag} (${owner.id})` : "Bilinmiyor", inline: false }
      )
      .setFooter({ text: "Guild Delete Event" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Sunucuya Git")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${guild.systemChannelId || guild.channels.cache.first()?.id || ""}`)
    );

    const logChannel = client.channels.cache.get("1416358157558485022");
    if (logChannel) logChannel.send({ embeds: [embed], components: [row] });
  });
};
