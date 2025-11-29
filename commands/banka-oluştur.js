const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message) => {
  let user = await User.findOne({ id: message.author.id });
  if (user) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Red").setDescription("⚠️ Zaten banka hesabın var!")]
    });
  }

  user = new User({ id: message.author.id, wallet: 100, bank: 0 }); // başlangıç parası
  await user.save();

  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("🏦 Banka Hesabı Oluşturuldu")
    .setDescription(`Hesabın açıldı!\nCüzdan: **100** coin\nBanka: **0** coin`);
  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["banka-oluştur"] };
module.exports.help = { name: "banka-oluştur" };
