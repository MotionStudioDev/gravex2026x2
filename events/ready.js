const client = require("../main");
const { Collection } = require("discord.js")
const fs = require("fs")
const db = require('orio.db')
client.on("ready", () => {
console.log(`${client.user.tag} Aktif!`)
  let x = [
    `Aktivite`
  ]
  let q = x[Math.floor(Math.random() * x.length)]
client.user.setActivity(q)

client.commands = new Collection();
client.aliases = new Collection();
fs.readdir("./commands/", (err, files) => {
if (err) console.error(err);
console.log(`Toplam ${files.length} komut var!`);
files.forEach(f => {
let props = require(`../commands/${f}`);
    
console.log(`${props.help.name}.js Komutu aktif!`);
    
client.commands.set(props.help.name, props);
props.conf.aliases.forEach(alias => {
client.aliases.set(alias, props.help.name);
});
});
});

});
