const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas');

module.exports.run = async (client, message, args) => {
  const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
  if (!member) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanım: g!ship <id/@üye>')]
    });
  }

  // Romantik cümleler (kişiselleştirilmiş)
  const romantikCumleler = [
    (a, b) => `Kader ${a.username} ile ${b.username}'i birleştirdi 💫`,
    (a, b) => `${a.username} ve ${b.username}, kalpleriniz aynı ritimde atıyor 💓`,
    (a, b) => `${a.username} ❤️ ${b.username} aşkının önünde kimse duramaz 🔥`,
    (a, b) => `Gökyüzü bile ${a.username} ile ${b.username}'i izliyor 🌌`,
    (a, b) => `Birlikte her şey daha güzel: ${a.username} + ${b.username} 🌹`,
    (a, b) => `${a.username} ve ${b.username}, aşkınız efsane olacak ✨`,
    (a, b) => `İki ruh, tek kalp: ${a.username} & ${b.username} 💕`
  ];

  // Embed üretici
  function shipEmbed(author, target, uyum) {
    let emoji = '💖';
    if (uyum < 30) emoji = '💔';
    else if (uyum < 70) emoji = '💞';

    const filled = Math.round(uyum / 10);
    const gradient = ['🟥','🟧','🟨','🟩','🟦','🟪'];
    const bar = Array.from({ length: 10 }, (_, i) =>
      i < filled ? gradient[i % gradient.length] : '⬜'
    ).join('');

    const romantik = romantikCumleler[Math.floor(Math.random() * romantikCumleler.length)](author, target);

    return new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('💖 Grave Ship!')
      .setDescription(`${author} ❤️ ${target}\n\n${emoji} Uyum: **%${uyum}**\n${bar}\n\n_${romantik}_`)
      .setImage('attachment://ship.jpg');
  }

  // Canvas görseli
  const canvas = Canvas.createCanvas(700, 250);
  const ctx = canvas.getContext('2d');
  const background = await Canvas.loadImage('./assets/kalpli.jpg'); // senin yüklediğin görsel
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  const avatar1 = await Canvas.loadImage(message.author.displayAvatarURL({ extension: 'png', size: 256 }));
  const avatar2 = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
  ctx.drawImage(avatar1, 50, 25, 200, 200);
  ctx.drawImage(avatar2, 450, 25, 200, 200);

  const attachment = { files: [{ attachment: canvas.toBuffer(), name: 'ship.jpg' }] };
  const uyum = Math.floor(Math.random() * 101);
  const embed = shipEmbed(message.author, member.user, uyum);

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
      const yeniUyum = Math.floor(Math.random() * 101);
      const newEmbed = shipEmbed(message.author, member.user, yeniUyum);
      await i.update({ embeds: [newEmbed], components: [row], ...attachment });
    }
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
    );
    await msg.edit({ components: [disabledRow] }).catch(() => {});
  });
};

module.exports.conf = { aliases: [] };
module.exports.help = { name: 'ship' };
