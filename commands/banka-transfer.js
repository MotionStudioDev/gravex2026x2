const { EmbedBuilder } = require("discord.js");
const User = require("../models/User");

module.exports.run = async (client, message, args) => {
  const target = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!target) return message.reply("⚠️ Bir kullanıcı etiketle.");
  if (!amount || amount <= 0) return message.reply("⚠️ Geçerli bir miktar gir.");

  let sender = await User.findOne({ id: message.author.id });
  if (!sender) return message.reply("⚠️ Önce banka hesabı oluştur (`g!banka-oluştur`).");

  if (amount > sender.bank) return message.reply("⚠️ Bankanda yeterli para yok.");

  let receiver = await User.findOne({ id: target.id });
  if (!receiver) {
    receiver = new User({ id: target.id, wallet: 0, bank: 0 });
  }

  sender.bank -= amount;
  receiver.bank += amount;
  await sender.save();
  await receiver.save();

  const embed = new EmbedBuilder()
    .setColor("Purple")
    .setTitle("🏦 Banka Transferi")
    .setDescription(
      `**${message.author.username}** → **${target.username}**\nTransfer edilen miktar: **${amount} coin**\nSenin banka: **${sender.bank}**`
    );
  message.channel.send({ embeds: [embed] });
};

module.exports.conf = { aliases: ["banka-transfer"] };
module.exports.help = { name: "banka-transfer" };
