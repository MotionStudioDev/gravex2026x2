/*=======================================================================================*/
/**
 * Modüller
 */

const { EmbedBuilder } = require("discord.js");
var config = require("../config.js");
const client = require("..");

// ⬇️ KARA LİSTE MODELİ VE PREFIX TANIMLARI
const Blacklist = require('../models/karaliste'); // 🚨 Model dosyasının yolu doğru olmalı
const prefix = config.prefix;

client.on("messageCreate", async (message) => {
  if (!message.guild) return;
  if (message.author.bot) return;

  // ⬇️ ENTEGRE EDİLMİŞ KARA LİSTE KONTROLÜ
  const isBlacklisted = await Blacklist.findOne({ guildID: message.guild.id });
  
  if (isBlacklisted) {
    // Sunucu kara listedeyse, komut işlenmez ve fonksiyon sonlanır.
    // Opsiyonel: message.guild.leave().catch(console.error); // Botu sunucudan atar
    return; 
  }
  // ⬆️ KARA LİSTE KONTROLÜ SONU

  if (!message.content.startsWith(prefix)) return;
  
  // ⬇️ MEVCUT KOMUT İŞLEME MANTIĞI BURADAN İTİBAREN DEVAM EDER
  let command = message.content.split(" ")[0].slice(prefix.length);
  let params = message.content.split(" ").slice(1);
  let cmd;
  
  if (client.commands.has(command)) {
    cmd = client.commands.get(command);
  } else if (client.aliases.has(command)) {
    cmd = client.commands.get(client.aliases.get(command));
  }
  
  if (cmd) {
    cmd.run(client, message, params);
  }

});
