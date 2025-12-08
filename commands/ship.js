const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');

module.exports.run = async (client, message, args) => {
    const kişi1 = message.author;
    const kişi2 = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);

    if (!kişi2) return message.reply("❌ Etiketle birini la!");
    if (kişi2.id === kişi1.id) return message.reply("❌ Kendinle ship mi yapıyon amk");
    if (kişi2.bot || kişi1.bot) return message.reply("🤖 Botla aşk olmaz.");

    // Aynı çift = aynı sonuç
    const seed = [kişi1.id, kişi2.id].sort().join('');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash += seed.charCodeAt(i);
    let uyum = (hash * 69) % 101;

    const canvas = Canvas.createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Arka plan
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, 800, 400);

    const avatar1 = await Canvas.loadImage(kişi1.displayAvatarURL({ extension: 'png', size: 512 }));
    const avatar2 = await Canvas.loadImage(kişi2.displayAvatarURL({ extension: 'png', size: 512 }));

    const size = 160;

    // Sol avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(170, 200, size/2 + 20, 0, Math.PI*2);
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#00ffff';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(avatar1, 170 - size/2, 200 - size/2, size, size);
    ctx.restore();

    // Sağ avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(630, 200, size/2 + 20, 0, Math.PI*2);
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#ff00ff';
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(avatar2, 630 - size/2, 200 - size/2, size, size);
    ctx.restore();

    // Kullanıcı adları (tam senin attığın gibi)
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    ctx.fillText(kişi1.username.toLowerCase(), 170, 340);

    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.fillText(kişi2.username.toLowerCase(), 630, 340);
    ctx.shadowBlur = 0;

    // %99 ÇEMBERİFT GLOW ÇEMBER + TAM ORTADA METİN
    const cx = 400;
    const cy = 200;

    // Dış glow çember
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI*2);
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#ff00ff';
    ctx.shadowBlur = 70;
    ctx.shadowColor = '#ff00ff';
    ctx.stroke();

    // İç çember
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI*2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // %99 METİN — BİREBİR AYNI
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#ff00ff';
    ctx.shadowBlur = 50;
    ctx.shadowColor = '#ff00ff';
    ctx.strokeText(`${uyum}%`, cx, cy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${uyum}%`, cx, cy);

    // Kalp
    ctx.font = '60px Arial';
    ctx.fillStyle = '#ff006e';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff006e';
    ctx.fillText('❤️', cx, cy + 120);

    // Progress bar — senin attığın gibi
    const barY = 365;
    ctx.fillStyle = '#1e1e2e';
    ctx.roundRect(120, barY, 560, 20, 20);
    ctx.fill();

    const gradient = ctx.createLinearGradient(120, 0, 680, 0);
    gradient.addColorStop(0, '#ff006e');
    gradient.addColorStop(0.5, '#ff00ff');
    gradient.addColorStop(1, '#00ffff');
    ctx.fillStyle = gradient;
    ctx.roundRect(120, barY, (uyum / 100) * 560, 20, 20);
    ctx.fill();

    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00ff';
    ctx.fillText(`%${uyum}`, 400, barY + 14);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'ship.png' });

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
            uyum = Math.floor(Math.random() * 101); // rastgele

            // YENİ RESMİ ÇİZ (aynı kod, sadece uyum değişti)
            const newCanvas = Canvas.createCanvas(800, 400);
            const n = newCanvas.getContext('2d');
            n.fillStyle = '#0a0a0f';
            n.fillRect(0, 0, 800, 400);

            // avatarlar aynı
            n.save(); n.beginPath(); n.arc(170, 200, size/2 + 20, 0, Math.PI*2); n.shadowBlur=40; n.shadowColor='#00ffff'; n.strokeStyle='#00ffff'; n.lineWidth=12; n.stroke(); n.clip(); n.drawImage(avatar1, 170-size/2, 200-size/2, size, size); n.restore();
            n.save(); n.beginPath(); n.arc(630, 200, size/2 + 20, 0, Math.PI*2); n.shadowBlur=40; n.shadowColor='#ff00ff'; n.strokeStyle='#ff00ff'; n.lineWidth=12; n.stroke(); n.clip(); n.drawImage(avatar2, 630-size/2, 200-size/2, size, size); n.restore();

            // isimler
            n.font = 'bold 30px Arial'; n.textAlign='center';
            n.fillStyle='#00ffff'; n.shadowBlur=15; n.shadowColor='#00ffff'; n.fillText(kişi1.username.toLowerCase(), 170, 340);
            n.fillStyle='#ff00ff'; n.shadowColor='#ff00ff'; n.fillText(kişi2.username.toLowerCase(), 630, 340); n.shadowBlur=0;

            // % yüzdelik
            n.beginPath(); n.arc(400, 200, 110, 0, Math.PI*2); n.lineWidth=20; n.strokeStyle='#ff00ff'; n.shadowBlur=70; n.shadowColor='#ff00ff'; n.stroke();
            n.beginPath(); n.arc(400, 200, 95, 0, Math.PI*2); n.lineWidth=10; n.strokeStyle='#ffffff'; n.stroke(); n.shadowBlur=0;

            n.font='bold 120px Arial'; n.textAlign='center'; n.textBaseline='middle';
            n.lineWidth=12; n.strokeStyle='#ff00ff'; n.shadowBlur=50; n.shadowColor='#ff00ff'; n.strokeText(`${uyum}%`, 400, 200);
            n.fillStyle='#ffffff'; n.fillText(`${uyum}%`, 400, 200);

            n.font='60px Arial'; n.fillStyle='#ff006e'; n.shadowBlur=30; n.shadowColor='#ff006e'; n.fillText('❤️', 400, 320);

            // bar
            n.fillStyle='#1e1e2e'; n.roundRect(120, 365, 560, 20, 20); n.fill();
            const g = n.createLinearGradient(120,0,680,0); g.addColorStop(0,'#ff006e'); g.addColorStop(0.5,'#ff00ff'); g.addColorStop(1,'#00ffff');
            n.fillStyle=g; n.roundRect(120, 365, (uyum/100)*560, 20, 20); n.fill();
            n.font='bold 22px Arial'; n.fillStyle='#fff'; n.shadowBlur=10; n.shadowColor='#ff00ff'; n.fillText(`%${uyum}`, 400, 379);

            const newAttachment = new AttachmentBuilder(newCanvas.toBuffer(), { name: 'ship.png' });

            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('#ff00ff')
                    .setDescription(`${kişi1} ❤️ ${kişi2}\n\n**Rastgele: %${uyum}**`)
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
