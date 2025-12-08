const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');

module.exports.run = async (client, message, args) => {
    const kişi1 = message.author;
    const kişi2 = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);

    if (!kişi2) return message.reply("Etiketle birini.");
    if (kişi2.id === kişi1.id) return message.reply("Kendinle ship mi yapıyon?");
    if (kişi2.bot || kişi1.bot) return message.reply("Botla aşk olmaz.");

    // Sabit oran
    const seed = [kişi1.id, kişi2.id].sort().join('');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash += seed.charCodeAt(i);
    let oran = (hash * 69) % 101;

    // Resim çizme fonksiyonu
    const draw = async (yuzde) => {
        const canvas = Canvas.createCanvas(800, 400);
        const c = canvas.getContext('2d');

        c.fillStyle = '#0a0a0f';
        c.fillRect(0, 0, 800, 400);

        const av1 = await Canvas.loadImage(kişi1.displayAvatarURL({ extension: 'png', size: 512 }));
        const av2 = await Canvas.loadImage(kişi2.displayAvatarURL({ extension: 'png', size: 512 }));

        // Sol avatar
        c.save();
        c.beginPath();
        c.arc(170, 200, 100, 0, Math.PI * 2);
        c.strokeStyle = '#00ffff';
        c.lineWidth = 12;
        c.shadowBlur = 50;
        c.shadowColor = '#00ffff';
        c.stroke();
        c.clip();
        c.drawImage(av1, 70, 100, 200, 200);
        c.restore();

        // Sağ avatar
        c.save();
        c.beginPath();
        c.arc(630, 200, 100, 0, Math.PI * 2);
        c.strokeStyle = '#ff00ff';
        c.lineWidth = 12;
        c.shadowBlur = 50;
        c.shadowColor = '#ff00ff';
        c.stroke();
        c.clip();
        c.drawImage(av2, 530, 100, 200, 200);
        c.restore();

        // İsimler
        c.font = 'bold 30px Arial';
        c.textAlign = 'center';
        c.fillStyle = '#00ffff';
        c.shadowBlur = 20;
        c.shadowColor = '#00ffff';
        c.fillText(kişi1.username.toLowerCase(), 170, 340);
        c.fillStyle = '#ff00ff';
        c.shadowColor = '#ff00ff';
        c.fillText(kişi2.username.toLowerCase(), 630, 340);
        c.shadowBlur = 0;

        // Glow çember
        c.beginPath();
        c.arc(400, 200, 110, 0, Math.PI * 2);
        c.lineWidth = 20;
        c.strokeStyle = '#ff00ff';
        c.shadowBlur = 80;
        c.shadowColor = '#ff00ff';
        c.stroke();

        c.beginPath();
        c.arc(400, 200, 95, 0, Math.PI * 2);
        c.lineWidth = 10;
        c.strokeStyle = '#ffffff';
        c.stroke();
        c.shadowBlur = 0;

        // Yüzde
        c.font = 'bold 120px Arial';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.lineWidth = 12;
        c.strokeStyle = '#ff00ff';
        c.shadowBlur = 60;
        c.shadowColor = '#ff00ff';
        c.strokeText(`${yuzde}%`, 400, 200);
        c.fillStyle = '#ffffff';
        c.fillText(`${yuzde}%`, 400, 200);

        // Kalp
        c.font = '60px Arial';
        c.fillStyle = '#ff006e';
        c.shadowBlur = 30;
        c.shadowColor = '#ff006e';
        c.fillText('❤️', 400, 320);

        // Bar
        c.fillStyle = '#1e1e2e';
        c.roundRect(120, 365, 560, 20, 20);
        c.fill();

        const grad = c.createLinearGradient(120, 0, 680, 0);
        grad.addColorStop(0, '#ff006e');
        grad.addColorStop(0.5, '#ff00ff');
        grad.addColorStop(1, '#00ffff');
        c.fillStyle = grad;
        c.roundRect(120, 365, (yuzde / 100) * 560, 20, 20);
        c.fill();

        c.font = 'bold 22px Arial';
        c.fillStyle = '#ffffff';
        c.shadowBlur = 10;
        c.shadowColor = '#ff00ff';
        c.fillText(`%${yuzde}`, 400, 379);

        return canvas.toBuffer();
    };

    // İlk mesaj
    const buffer = await draw(oran);
    const dosya = new AttachmentBuilder(buffer, { name: 'ship.png' });

    const embed = new EmbedBuilder()
        .setColor('#ff00ff')
        .setDescription(`${kişi1} ❤️ ${kişi2}\n\n**Uyum Oranı: %${oran}**`)
        .setImage('attachment://ship.png');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('tekrar')
                .setLabel('Tekrar Dene')
                .setStyle(ButtonStyle.Success)
                .setEmoji('U+1F3B2'),
            new ButtonBuilder()
                .setCustomId('sil')
                .setLabel('Sil')
                .setStyle(ButtonStyle.Danger)
        );

    const msg = await message.reply({ embeds: [embed], files: [dosya], components: [row] });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 180000 });

    collector.on('collect', async i => {
        if (i.customId === 'sil') {
            return msg.delete().catch(() => {});
        }

        if (i.customId === 'tekrar') {
            oran = Math.floor(Math.random() * 101);
            const yeniBuffer = await draw(oran);
            const yeniDosya = new AttachmentBuilder(yeniBuffer, { name: 'ship.png' });

            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('#ff1493')
                    .setDescription(`${kişi1} ❤️ ${kişi2}\n\nRastgele: %${oran}**`)
                    .setImage('attachment://ship.png')
                ],
                files: [yeniDosya],
                components: [row]
            });
        }
    });

    collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
};

module.exports.conf = { aliases: ['aşk', 'ship', 'uyum', 'love'] };
module.exports.help = { name: 'ship' };
