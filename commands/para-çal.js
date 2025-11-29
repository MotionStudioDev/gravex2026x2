const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message, args) => {
  const target = message.mentions.users.first();
  if (!target) return message.reply("⚠️ Bir kullanıcı etiketle.");

  if (target.id === message.author.id) {
    return message.reply("⚠️ Kendinden para çalamazsın.");
  }

  let thief = await User.findOne({ id: message.author.id });
  if (!thief) thief = new User({ id: message.author.id, wallet: 0, bank: 0 });

  let victim = await User.findOne({ id: target.id });
  if (!victim) victim = new User({ id: target.id, wallet: 0, bank: 0 });

  if (victim.wallet <= 0) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Red").setDescription("😢 Bu kişinin cüzdanında hiç para yok.")]
    });
  }

  // cooldown: 1 saat
  if (thief.lastSteal && Date.now() - thief.lastSteal.getTime() < 3600000) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Yellow").setDescription("⏳ Tekrar çalmak için 1 saat beklemelisin.")]
    });
  }

  const success = Math.random() < 0.5; // %50 başarı
  const amount = Math.floor(Math.random() * (victim.wallet * 0.3)) + 1; // max %30

  if (success) {
    victim.wallet -= amount;
    thief.wallet += amount;
    thief.lastSteal = new Date();
    await victim.save();
    await thief.save();

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("🕵️ Para Çaldın!")
      .setDescription(`**${target.username}**'den **${amount} coin** çaldın!\nYeni cüzdan: **${thief.wallet}**`);
    message.channel.send({ embeds: [embed] });
  } else {
    // başarısız → ceza
    const penalty = Math.floor(Math.random() * 200) + 50;
    thief.wallet = Math.max(0, thief.wallet - penalty);
    thief.lastSteal = new Date();
    await thief.save();

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("🚨 Yakalandın!")
      .setDescription(`Çalmaya çalışırken yakalandın! **${penalty} coin** ceza ödedin.\nYeni cüzdan: **${thief.wallet}**`);
    message.channel.send({ embeds: [embed] });
  }
};

module.exports.conf = { aliases: ["çal", "rob", "steal"] };
module.exports.help = { name: "çal" };
