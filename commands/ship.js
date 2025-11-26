const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas');

module.exports.run = async (client, message, args) => {
  const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
  if (!member) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Kullanım: g!ship <id/@üye>')]
    });
  }

  // Romantik cümleler (kişiselleştirilmiş)
  const romantikCumleler = [
    (author, target) => `Kader ${author.username} ile ${target.username}'i birleştirdi 💫`,
    (author, target) => `${author.username} ve ${target.username}, kalpleriniz aynı ritimde atıyor 💓`,
    (author, target) => `${author.username} ❤️ ${target.username} aşkının önünde kimse duramaz 🔥`,
    (author, target) => `Gökyüzü bile ${author.username} ile ${target.username}'i izliyor 🌌`,
    (author, target) => `Birlikte her şey daha güzel: ${author.username} + ${target.username} 🌹`,
    (author, target) => `${author.username} ve ${target.username}, aşkınız efsane olacak ✨`,
    (author, target) => `İki ruh, tek kalp: ${author.username} & ${target.username} 💕`
  ];

  function shipEmbed(author, member) {
    const uyum = Math.floor(Math.random() * 101);
    let emoji = '💖';
    if (uyum < 30) emoji = '💔';
    else if (uyum < 70) emoji = '💞';

    const filled = Math.round(uyum / 10);
    const gradient = ['🟥','🟧','🟨','🟩','🟦','🟪'];
    let bar = '';
    for (let i = 0; i < 10; i++) {
      if (i < filled) bar += gradient[i % gradient.length];
      else bar += '⬜';
    }

    const romantik = romantikCumleler[Math.floor(Math.random() * romantikCumleler.length)](author, member);

    return new EmbedBuilder()
      .setColor('Pink')
      .setTitle('💖 Ultra Mega Ship!')
      .setDescription(`${author} ❤️ ${member}\n\n${emoji} Uyum: **%${uyum}**\n${bar}\n\n_${romantik}_`)
      .setImage('attachment://ship.png');
  }

  // Canvas görseli
  const canvas = Canvas.createCanvas(700, 250);
  const ctx = canvas.getContext('2d');
  const background = await Canvas.loadImage('https://i.imgur.com/3GvwNBf.png');
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  const avatar1 = await Canvas.loadImage(message.author.displayAvatarURL({ extension: 'png', size: 256 }));
  const avatar2 = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
  ctx.drawImage(avatar1, 50, 25, 200, 200);
  ctx.drawImage(avatar2, 450, 25, 200, 200);

  const attachment = { files: [{ attachment: canvas.toBuffer(), name: 'ship.png' }] };

  // İlk embed
  const embed = shipEmbed(message.author, member);

  // Butonlar
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ship_delete').setLabel('Sil').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ship_again').setLabel('Tekrar Shiple').setStyle(ButtonStyle.Success)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row], ...attachment });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 30000
  });

  collector.on('collect', async i => {
    if (i.customId === 'ship_delete') {
      await msg.delete().catch(() => {});
      collector.stop();
    }
    if (i.customId === 'ship_again') {
      const newEmbed = shipEmbed(message.author, member);
      await i.update({ embeds: [newEmbed], components: [row], ...attachment });
    }
  });

  collector.on('end', async () => {
    try {
      const disabledRow = new ActionRowBuilder().addComponents(
        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );
      await msg.edit({ components: [disabledRow] });
    } catch {}
  });
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'ship' };
