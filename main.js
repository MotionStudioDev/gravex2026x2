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

require("./events/message.js")
require("./events/ready.js")

/*=======================================================================================*/

/*=======================================================================================*/
let x = "TOKEN"
    /**
 * Token
 */
client.login(x).catch(e => {
if(!x){
console.log("Lütfen bir token gir")
process.exit(0)
}
if(e.toString().includes("TOKEN_INVALID")){
console.log("Lütfen düzgün bir token gir")
process.exit(0)
}
if(e.toString().includes("DISALLOWED_INTENTS")){
console.log("Lütfen tokenini girdiğin botun intentlerini aç (tek yapman gereken https://discord.com/developers/applications sayfasına girip bot kısmına girip alta inip tüm gri yerleri açıp mavi yap.)")
process.exit(0)
} 
console.error(e)
process.exit(0)
})

/*=======================================================================================*/
