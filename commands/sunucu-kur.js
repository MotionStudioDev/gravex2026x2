const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports.run = async (client, message) => {
  try {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🤖 Bot')
      .setDescription('Nasıl bir sunucu kurmak istiyorsun?\n\nButonlar ile seçermisin?');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('normal').setLabel('Normal Sunucu').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('public').setLabel('Public Sunucusu').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('adult').setLabel('+18 Sunucu').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('game').setLabel('Oyun Sunucusu').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('design').setLabel('Tasarım Sunucusu').setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async i => {
      let type = '';
      if (i.customId === 'normal') type = 'Normal Sunucu';
      if (i.customId === 'public') type = 'Public Sunucusu';
      if (i.customId === 'adult') type = '+18 Sunucu';
      if (i.customId === 'game') type = 'Oyun Sunucusu';
      if (i.customId === 'design') type = 'Tasarım Sunucusu';

      const confirmEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('⚠️ Dikkat!')
        .setDescription(`Seçiminiz: **${type}**\n\nSunucunuz kurulacak.\nOnaylıyor musunuz?\n\nOnay verilmediği taktirde işleminiz iptal edilecektir.`);

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('✅ Onaylıyorum').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel').setLabel('❌ İptal').setStyle(ButtonStyle.Danger)
      );

      await i.update({ embeds: [confirmEmbed], components: [confirmRow] });

      const confirmCollector = msg.createMessageComponentCollector({
        filter: x => x.user.id === message.author.id,
        time: 30000
      });

      confirmCollector.on('collect', async x => {
        if (x.customId === 'confirm') {
          const doneEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Sunucu Kurulumu Başladı')
            .setDescription(`**${type}** için roller, izinler ve kanallar ayarlanıyor...`);

          await x.update({ embeds: [doneEmbed], components: [] });

          // 🔧 Roller
          try {
            await message.guild.roles.create({
              name: '👑 Yönetici',
              permissions: [PermissionsBitField.Flags.Administrator],
              color: '#FF0000'
            });
            await message.guild.roles.create({
              name: '🛡️ Mod',
              permissions: [
                PermissionsBitField.Flags.KickMembers,
                PermissionsBitField.Flags.BanMembers,
                PermissionsBitField.Flags.ManageMessages
              ],
              color: '#00FF00'
            });
            await message.guild.roles.create({
              name: '👥 Üye',
              permissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
              color: '#5865F2'
            });
            await message.guild.roles.create({
              name: '👤 Misafir',
              permissions: [PermissionsBitField.Flags.ViewChannel],
              color: '#99AAB5'
            });

            // Tipine özel roller
            if (type === 'Public Sunucusu') {
              await message.guild.roles.create({ name: '⭐ VIP', color: '#FFD700' });
            }
            if (type === 'Oyun Sunucusu') {
              await message.guild.roles.create({ name: '🎮 Oyuncu', color: '#00FFFF' });
            }
            if (type === 'Tasarım Sunucusu') {
              await message.guild.roles.create({ name: '🎨 Designer', color: '#E91E63' });
            }
            if (type === '+18 Sunucu') {
              await message.guild.roles.create({ name: '🔞 Adult', color: '#8B0000' });
            }
          } catch (err) {
            console.error('Rol oluşturma hatası:', err);
          }

          // 🔧 Kanallar kategori bazlı
          try {
            const infoCat = await message.guild.channels.create({ name: '📌 Bilgilendirme', type: 4 });
            await message.guild.channels.create({ name: '📢 Duyurular', type: 0, parent: infoCat.id });
            await message.guild.channels.create({ name: '📜 Kurallar', type: 0, parent: infoCat.id });

            const chatCat = await message.guild.channels.create({ name: '💬 Sohbet', type: 4 });
            await message.guild.channels.create({ name: 'genel-sohbet', type: 0, parent: chatCat.id });
            await message.guild.channels.create({ name: 'bot-komut', type: 0, parent: chatCat.id });

            const voiceCat = await message.guild.channels.create({ name: '🔊 Ses Kanalları', type: 4 });
            await message.guild.channels.create({ name: 'Genel Ses', type: 2, parent: voiceCat.id });

            // Tipine özel kanallar
            if (type === 'Oyun Sunucusu') {
              const gameCat = await message.guild.channels.create({ name: '🎮 Oyun', type: 4 });
              await message.guild.channels.create({ name: 'oyun-sohbet', type: 0, parent: gameCat.id });
              await message.guild.channels.create({ name: 'oyun-ses', type: 2, parent: gameCat.id });
            }
            if (type === 'Tasarım Sunucusu') {
              const designCat = await message.guild.channels.create({ name: '🎨 Tasarım', type: 4 });
              await message.guild.channels.create({ name: 'tasarım-paylaşım', type: 0, parent: designCat.id });
              await message.guild.channels.create({ name: 'feedback', type: 0, parent: designCat.id });
              await message.guild.channels.create({ name: 'tasarım-ses', type: 2, parent: designCat.id });
            }
            if (type === '+18 Sunucu') {
              const adultCat = await message.guild.channels.create({ name: '🔞 Adult', type: 4 });
              await message.guild.channels.create({ name: 'adult-chat', type: 0, parent: adultCat.id });
              await message.guild.channels.create({ name: 'adult-ses', type: 2, parent: adultCat.id });
            }
          } catch (err) {
            console.error('Kanal oluşturma hatası:', err);
          }

          confirmCollector.stop();
        }
        if (x.customId === 'cancel') {
          const cancelEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ İşlem İptal Edildi')
            .setDescription('Sunucu kurulumu iptal edildi.');

          await x.update({ embeds: [cancelEmbed], components: [] });
          confirmCollector.stop();
        }
      });
    });

    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
        await msg.edit({ components: [disabledRow] });
      } catch {}
    });
  } catch (err) {
    console.error('Sunucu-kur komutu hatası:', err);
    message.channel.send('⚠️ | Sunucu kurulumu sırasında bir hata oluştu.');
  }
};

module.exports.conf = { aliases: ['sunucukur'] };
module.exports.help = { name: 'sunucu-kur' };
