const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas');

function drawCircularImage(ctx, image, x, y, size, color) {
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();

    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();
}

function drawProgressBar(ctx, uyum, y) {
    const width = 600;
    const height = 28;
    const x = 50;
    const radius = 14;

    // Arka plan
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();

    // Dolgu (gradient)
    const fill = (uyum / 100) * width;
    const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#f984e5');
    gradient.addColorStop(1, '#8b5cf6');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, fill, height, radius);
    ctx.fill();

    // Yüzde yazısı
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`%${uyum}`, x + fill / 2, y + height / 2 + 7);
}

module.exports.run = async (client, message, args) => {
    let target1 = message.author;
    let target2 = message.mentions.members.first()?.user || message.guild.members.cache.get(args[0])?.user;

    if (!target2) return message.reply("❌ Birini etiketle veya ID yaz!");
    if (target2.id === target1.id) return message.reply("❌ Kendinle ship olamazsın!");
    if (target1.bot || target2.bot) return message.reply("🤖 Botlar aşka kapalı.");

    // Aynı çift her zaman aynı sonucu alır
    const seed = [target1.id, target2.id].sort().join('');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash += seed.charCodeAt(i);
    const uyum = (hash * 97) % 101;

    const canvas = Canvas.createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Arka plan
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, 800, 400);

    const avatar1 = await Canvas.loadImage(target1.displayAvatarURL({ extension: 'png', size: 512 }));
    const avatar2 = await Canvas.loadImage(target2.displayAvatarURL({ extension: 'png', size: 512 }));

    const size = 180;
    const padding = 80;

    drawCircularImage(ctx, avatar1, padding, 110, size, '#00ffea');
    drawCircularImage(ctx, avatar2, 800 - padding - size, 110, size, '#ff00c8');

    // Kullanıcı adları
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ffea';
    ctx.fillText(target1.username.slice(0, 12), padding + size / 2, 330);
    ctx.fillStyle = '#ff00c8';
    ctx.fillText(target2.username.slice(0, 12), 800 - padding - size / 2, 330);

    // % ÇEMBERİ VE METİN (MÜKEMMEL ORTALANMIŞ)
    const centerX = 400;
    const centerY = 200;
    const circleRadius = 90;

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ff00c8';
    ctx.beginPath();
    ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 92px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // EN ÖNEMLİ SATIR

    ctx.strokeStyle = '#ff00c8';
    ctx.lineWidth = 7;
    ctx.strokeText(`${uyum}%`, centerX, centerY);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${uyum}%`, centerX, centerY);

    // Kalp
    ctx.font = '70px Arial';
    ctx.fillStyle = '#ff006e';
    ctx.fillText('❤️', centerX, centerY + circleRadius + 50);

    // Progress bar
    drawProgressBar(ctx, uyum, 340);

    const attachment = { attachment: canvas.toBuffer(), name: 'ship.png' };

    const embed = new EmbedBuilder()
        .setColor(uyum > 80 ? '#ff00c8' : uyum > 50 ? '#ff6b6b' : '#8b5cf6')
        .setTitle(`${uyum >= 90 ? 'Efsane Çift' : uyum >= 70 ? 'Çok İyi' : uyum >= 40 ? 'Fena Değil' : 'Zor Görünüyor'} ${uyum >= 95 ? '100%' : ''}`)
        .setDescription(`**${target1.username}** ❤️ **${target2.username}**\n\n**Uyum Oranı: %${uyum}**`)
        .setImage('attachment://ship.png')
        .setFooter({ text: 'Tekrar Dene butonuyla rastgele sonuç alabilirsin!' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('yeniden').setLabel('Tekrar Dene').setStyle(ButtonStyle.Success).setEmoji('🎲'),
        new ButtonBuilder().setCustomId('sil').setLabel('Sil').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.reply({ embeds: [embed], files: [attachment], components: [row] });

    const filter = i => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async i => {
        if (i.customId === 'sil') {
            msg.delete().catch(() => {});
        }

        if (i.customId === 'yeniden') {
            const randomUyum = Math.floor(Math.random() * 101);

            const newCanvas = Canvas.createCanvas(800, 400);
            const ntx = newCanvas.getContext('2d');

            ntx.fillStyle = '#0f0f0f';
            ntx.fillRect(0, 0, 800, 400);

            drawCircularImage(ntx, avatar1, padding, 110, size, '#00ffea');
            drawCircularImage(ntx, avatar2, 800 - padding - size, 110, size, '#ff00c8');

            ntx.font = 'bold 28px Arial';
            ntx.textAlign = 'center';
            ntx.fillStyle = '#00ffea';
            ntx.fillText(target1.username.slice(0, 12), padding + size / 2, 330);
            ntx.fillStyle = '#ff00c8';
            ntx.fillText(target2.username.slice(0, 12), 800 - padding - size / 2, 330);

            ntx.lineWidth = 10;
            ntx.strokeStyle = '#ffffff';
            ntx.shadowBlur = 25;
            ntx.shadowColor = '#ff00c8';
            ntx.beginPath();
            ntx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
            ntx.stroke();
            ntx.shadowBlur = 0;

            ntx.font = 'bold 92px Arial';
            ntx.textAlign = 'center';
            ntx.textBaseline = 'middle';
            ntx.strokeStyle = '#ff00c8';
            ntx.lineWidth = 7;
            ntx.strokeText(`${randomUyum}%`, centerX, centerY);
            ntx.fillStyle = '#ffffff';
            ntx.fillText(`${randomUyum}%`, centerX, centerY);

            ntx.font = '70px Arial';
            ntx.fillStyle = '#ff006e';
            ntx.fillText('❤️', centerX, centerY + circleRadius + 50);

            drawProgressBar(ntx, randomUyum, 340);

            const newEmbed = new EmbedBuilder()
                .setColor('#8b5cf6')
                .setTitle(`Rastgele Sonuç: %${randomUyum} ${randomUyum >= 90 ? 'AŞIRI UYUMLU' : ''}`)
                .setDescription(`**${target1.username}** ❤️ **${target2.username}**`)
                .setImage('attachment://ship.png');

            await i.update({ embeds: [newEmbed], files: [{ attachment: newCanvas.toBuffer(), name: 'ship.png' }], components: [row] });
        }
    });

    collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
    });
};

module.exports.conf = { aliases: ['aşkölçer', 'uyum', 'love', 'aşk'] };
module.exports.help = { name: 'ship' };
