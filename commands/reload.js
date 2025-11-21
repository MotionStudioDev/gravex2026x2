const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

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

  // Onay embed'i
  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle('⚠️ Reload Onayı')
    .setDescription('Botun komutlarını yeniden yüklemek üzeresin.\nOnay veriyorsan **EVET**, iptal için **HAYIR** bas.');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('evet').setLabel('EVET').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('hayir').setLabel('HAYIR').setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 15000
  });

  collector.on('collect', async i => {
    if (i.customId === 'evet') {
      // EVET basıldı
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('<a:yukle:1440677432976867448> Reload Başlatıldı')
            .setDescription('Komutlar yeniden başlatılıyor. Bekle!')
        ],
        components: []
      });

      try {
        client.commands.clear();
        client.aliases.clear();

        let count = 0;
        fs.readdirSync("./commands/").forEach(file => {
          const props = require(`../commands/${file}`);
          client.commands.set(props.help.name, props);
          props.conf.aliases.forEach(alias => {
            client.aliases.set(alias, props.help.name);
          });
          count++;
        });

        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ Reload Başarılı')
              .setDescription(`Tüm komutlar yeniden yüklendi.\nYüklenen komut sayısı: **${count}**`)
          ]
        });
      } catch (err) {
        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('❌ Reload Hatası')
              .setDescription(`${err.message}`)
          ]
        });
      }

      collector.stop();
    }

    if (i.customId === 'hayir') {
      // HAYIR basıldı
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Reload İptal')
            .setDescription('Komut yenileme iptal edildi!')
        ],
        components: []
      });
      collector.stop();
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = {
  aliases: []
};

module.exports.help = {
  name: 'reload'
};
