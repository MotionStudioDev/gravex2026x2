const { ButtonStyle } = require('discord.js')
const db = require("orio.db");
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
let config = require(`../config.js`)
module.exports.run = async (client, message, args) => {
  message.channel.send('sa')
};
module.exports.conf = {
  aliases: []
};
module.exports.help = {
  name: "yardım"
};
