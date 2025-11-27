/*=======================================================================================*/

  /**
 * Modüller
 */

const {PermissionsBitField, EmbedBuilder, ButtonStyle, Client, GatewayIntentBits, ChannelType, Partials, ActionRowBuilder, SelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, SelectMenuInteraction, ButtonBuilder } = require("discord.js");
const { Collection } = require("discord.js");
const config = require("./config.js");
const fs = require("fs");
const db = require("orio.db");
const Discord = require("discord.js")
const moment = require('moment')
require('moment-duration-format')
moment.locale('tr')
/*=======================================================================================*/
/////////////////////MONGO 
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB’ye bağlanıldı!"))
  .catch(err => console.error("❌ MongoDB bağlantı hatası:", err));

/*=======================================================================================*/

  /**
 * Clients
 */

const client = new Client({
  partials: [
    Partials.Message, // Mesaj
    Partials.Channel, // Yazı kanalı
    Partials.GuildMember, // Sunucu üyesi
    Partials.Reaction, // Emoji mesajı
    Partials.GuildScheduledEvent, // Sunucu etkinliği
    Partials.User, // Discord üyesi
    Partials.ThreadMember, // Konu üyesi
  ],
  intents: [
    GatewayIntentBits.Guilds, // Sunucu ile ilgili şeyler 
    GatewayIntentBits.GuildMembers, // Sunucu üyeleri için ilgili şeyler
    GatewayIntentBits.GuildBans, // Sunucu yasaklarını yönetmek için
    GatewayIntentBits.GuildEmojisAndStickers, // Emojileri ve çıkartmaları yönetmek
    GatewayIntentBits.GuildIntegrations, // Discord Entegrasyonları
    GatewayIntentBits.GuildWebhooks, // Discord web kancaları
    GatewayIntentBits.GuildInvites, // Sunucu davet yönetimi için
    GatewayIntentBits.GuildVoiceStates, // Ses kanallarının yönetimi
    GatewayIntentBits.GuildPresences, // Sunucu sâhipliğinin yönetimi
    GatewayIntentBits.GuildMessages, // Sunucu mesajlarının yönetimi
    GatewayIntentBits.GuildMessageReactions, // Mesaj emojilerinin yönetimi
    GatewayIntentBits.GuildMessageTyping, // Mesaj yazmanın yönetimi
    GatewayIntentBits.DirectMessages, // Özel mesaj
    GatewayIntentBits.DirectMessageReactions, // Özel mesaj emojisi
    GatewayIntentBits.DirectMessageTyping, // Özel mesaj yazmak 
    GatewayIntentBits.MessageContent, // Mesaj içeriğine ihtiyacınız varsa etkinleştirin
  ],
});

module.exports = client;
/*=======================================================================================*/
  /**
 * Events loader.
 */
client.sayaçlar = new Map();
client.sayaçKanalları = new Map();

client.kufurEngel = new Map();        // guildId → true/false
client.kufurLogKanalları = new Map(); // guildId → kanalId

client.antiRaid = new Map();                   // guildId → { aktif: true, eşik: 5, süre: 10 }
client.antiRaidLogKanalları = new Map();       // guildId → kanalId
client.antiRaidGirişler = new Map();           // guildId → [timestamp1, timestamp2, ...]

client.emojiLogKanalları = new Map(); // guildId → kanalId
client.sesLogKanalları = new Map(); // guildId → kanalId
client.otoroller = new Map();           // guildId → rolId
client.otorolLogKanalları = new Map();  // guildId → kanalId
client.reklamLogKanalları = new Map(); // guildId → kanalId

client.on('emojiCreate', require('./events/emojiCreate'));
client.on('emojiDelete', require('./events/emojiDelete'));
client.on('emojiUpdate', require('./events/emojiUpdate'));

client.on('guildMemberAdd', require('./events/guildMemberAdd'));
client.on('guildMemberRemove', require('./events/guildMemberRemove'));
client.on('messageCreate', require('./events/messageCreate'));
require("./events/message.js")
require("./events/ready.js")
require("./logger.js")(client);


/*=======================================================================================*/

/*=======================================================================================*/
let x = process.env.TOKEN;

/**
 * Token
 */
client.login(x).catch(e => {
  
  if (!x) {
    console.log("Lütfen bir token gir (process.env.TOKEN ayarlanmamış)");
    process.exit(0);
  }

  if (e.toString().includes("TOKEN_INVALID")) {
    console.log("Lütfen düzgün bir token gir");
    process.exit(0);
  }

  if (e.toString().includes("DISALLOWED_INTENTS")) {
    console.log("Lütfen botunun intentlerini aç. (Discord Developer Portal → Bot → Privileged Gateway Intents)");
    process.exit(0);
  }

  console.error(e);
  process.exit(0);

});


/*=======================================================================================*/
////// 7/24 
// Express sunucusu (Render gibi platformlarda botu canlı tutmak için)
if (!client.shard || client.shard.ids[0] === 0) {
  const express = require('express');
  const app = express();
  const port = process.env.PORT || 3000; // Render portu

  app.get('/', (req, res) => {
    res.sendStatus(200);
  });

  app.listen(port, () => {
    console.log(`🌐 Web sunucu ${port} portunda çalışıyor (sadece Shard 0).`);
  });
}
