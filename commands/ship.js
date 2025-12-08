const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');

module.exports.run = async (client, message, args) => {
    const kişi1 = message.author;
    const kişi2 = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);

    if (!kişi2) return message.reply("❌ Etiketle birini.");
    if (kişi2.id === kişi1.id) return message.reply("❌ Kendinle ship olmaz.");
    if (kişi2.bot || kişi1.bot) return message.reply("🤖 Botla aşk yok.");

    // Sabit sonuç
    const seed = [kişi1.id, kişi2.id].sort().join('');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash += seed.charCodeAt(i);
    let uyum = (hash * 69) % 101;

    // Canvas fonksiyonu (tekrar kullanmak için)
    const createImage = async (yuzde) => {
        const canvas = Canvas.createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        // Arka plan
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, 800, 400);

        const avatar1 = await Canvas.loadImage(kişi1.displayAvatarURL({ extension: 'png', size: 512 }));
        const avatar2 = await Canvas.loadImage(kişi2.displayAvatarURL({ extension: 'png', size: 512 }));

        // Sol avatar (cyan)
        ctx.save();
        ctx.beginPath();
        ctx.arc(170, 200, 100, 0, Math.PI * 2);
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#00ffff';
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(avatar1, 70, 100, 200, 200);
        ctx.restore();

        // Sağ avatar (magenta)
        ctx.save();
        ctx.beginPath();
        ctx.arc(630, 200, 100, 0, Math.PI * 2);
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#ff00ff';
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(avatar2, 530, 100, 200, 200);
        ctx.restore();

        // İsimler
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.fillText(kişi1.username.toLowerCase(), 170, 340);
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.fillText(kişi2.username.toLowerCase(), 630, 340);
        ctx.shadowBlur = 0;

        // %99 ÇEMBERİ
        ctx.beginPath();
        ctx.arc(400, 200, 110, 0, Math.PI * 2);
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#ff00ff';
        ctx.shadowBlur = 80;
        ctx.shadowColor = '#ff00ff';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(400, 200, 95, 0, Math.PI * 2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // %99 YAZISI (tam ortada)
        ctx.font = 'bold 130px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#ff00ff';
        ctx.shadowBlur = 60;
        ctx.shadowColor = '#ff00ff';
        ctx.strokeText(`${yuzde}%`, 400, 200);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${yuzde}%`, 400, 200);

        // Kalp
        ctx.font = '70px Arial';
        ctx.fillStyle = '#ff006e';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ff006e';
        ctx.fillText('❤️', 400, 320);

        // Progress bar
        const barY = 365;
        ctx.fillStyle = '#1e1e2e';
        ctx.roundRect(120, barY, 560, 24, 20);
        ctx.fill();

        const grad = ctx.createLinearGradient(120, 0, 680, 0);
        grad.addColorStop(0, '#ff006e');
        grad.addColorStop(0.5, '#ff00ff');
        grad.addColorStop(1, '#00ffff');
        ctx.fillStyle = grad;
        ctx.roundRect(120, barY, (yuzde / 100) * 560, 24, 20);
        ctx.fill();

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00ff';
        ctx.fillText(`%${yuzde}`, 400, barY + 18);

        return canvas.toBuffer();
    };

    // İlk resim
    const buffer = await createImage(uyum);
    const attachment = new AttachmentBuilder(buffer, { name: 'ship.png' });

    const embed = new EmbedBuilder()
        .setColor('#ff00ff')
        .setDescription(`${kişi1} ❤️ ${kişi2}\n\n**Uyum Oranı: %${uyum}**`)
        .setImage('attachment://ship.png');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tekrar').setLabel('Tekrar Dene').setStyle(ButtonStyle.Success).setEmoji('Dice'),
        new ButtonBuilder().setCustomId('sil').setLabel('Sil').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.reply({ embeds: [embed], files: [attachment], components: [row] });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 300000 });

    collector.on('collect', async i => {
        if (i.customId === 'sil') {
            msg.delete().catch(() => {});
            return;
        }

        if (i.customId === 'tekrar') {
            const randomYuzde = Math.floor(Math.random() * 101);
            const newBuffer = await createImage(randomYuzde);
            const newAttachment = new AttachmentBuilder(newBuffer, { name: 'ship.png' });

            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('#ff1493')
                    .setDescription(`${kişi1} ❤️ ${kişi2}\n\n**Rastgele: %${randomYuzde}**`)
                    .setImage('attachment://ship.png')
                ],
                files: [newAttachment],
                components: [row]
            });
        }
    });

    collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ['aşk', 'ship', 'uyum', 'love'] };
module.exports.help = { name: 'ship' };
