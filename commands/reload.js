const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

// Buraya kendi Discord ID'ni yaz
const SAHIP_ID = "702901632136118273";

module.exports.run = async (client, message) => {
  if (message.author.id !== SAHIP_ID) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Yetkisiz')
          .setDescription('Bu komutu sadece bot sahibi kullanabilir.')
      ]
    });
  }

  try {
    client.commands.clear();
    client.aliases.clear();

    fs.readdirSync("./commands/").forEach(file => {
      const props = require(`../commands/${file}`);
      client.commands.set(props.help.name, props);
      props.conf.aliases.forEach(alias => {
        client.aliases.set(alias, props.help.name);
      });
    });

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Reload Başarılı')
          .setDescription('Tüm komutlar yeniden yüklendi.')
      ]
    });
  } catch (err) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Reload Hatası')
          .setDescription(`${err.message}`)
      ]
    });
  }
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: 'reload'
};
