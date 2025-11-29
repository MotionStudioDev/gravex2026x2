const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const User = require("../models/User");

// Senin Discord ID
const OWNER_ID = "702901632136118273";

module.exports.run = async (client, message, args) => {
  if (message.author.id !== OWNER_ID) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor("Red").setDescription("⚠️ Bu komutu sadece botun kurucusu kullanabilir.")]
    });
  }

  const action = args[0]; // ekle veya sil
  const target = message.mentions.users.first();
  const amount = parseInt(args[2]);

  if (!["ekle", "sil"].includes(action)) {
    return message.reply("⚠️ Kullanım: g!apara <ekle|sil> @user <miktar>");
  }
  if (!target) return message.reply("⚠️ Bir kullanıcı etiketle.");
  if (!amount || amount <= 0) return message.reply("⚠️ Geçerli bir miktar gir.");

  let user = await User.findOne({ id: target.id });
  if (!user) user = new User({ id: target.id, wallet: 0, bank: 0 });

  // Onay embed
  const confirmEmbed = new EmbedBuilder()
    .setColor("Yellow")
    .setTitle("⚠️ İşlem Onayı")
    .setDescription(
      `**${target.username}** için **${amount} coin** ${action === "ekle" ? "eklenecek" : "silinecek"}.\n\n` +
      `Cüzdan: ${user.wallet}\nBanka: ${user.bank}\n\nOnaylıyor musun?`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("onay")
      .setLabel("✅ Onayla")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("iptal")
      .setLabel("❌ İptal")
      .setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 15000
  });

  collector.on("collect", async i => {
    if (i.customId === "onay") {
      if (action === "ekle") {
        user.wallet += amount;
        user.bank += amount; // hem cüzdan hem bankaya ekle
      } else {
        user.wallet = Math.max(0, user.wallet - amount);
        user.bank = Math.max(0, user.bank - amount);
      }
      await user.save();

      const doneEmbed = new EmbedBuilder()
        .setColor(action === "ekle" ? "Green" : "Red")
        .setTitle(action === "ekle" ? "💰 Para Eklendi" : "💰 Para Silindi")
        .setDescription(
          `**${target.username}** için işlem tamamlandı.\n` +
          `Cüzdan: ${user.wallet}\nBanka: ${user.bank}`
        );

      await i.update({ embeds: [doneEmbed], components: [] });
      collector.stop();
    } else if (i.customId === "iptal") {
      const cancelEmbed = new EmbedBuilder()
        .setColor("Grey")
        .setTitle("❌ İşlem İptal")
        .setDescription("İşlem iptal edildi.");
      await i.update({ embeds: [cancelEmbed], components: [] });
      collector.stop();
    }
  });

  collector.on("end", async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = { aliases: ["apara"] };
module.exports.help = { name: "apara" };
