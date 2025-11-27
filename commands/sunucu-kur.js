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
            await message.guild.roles.create({ name: '👑 Yönetici', permissions: [PermissionsBitField.Flags.Administrator], color: '#FF0000' });
            await message.guild.roles.create({ name: '🛡️ Mod', permissions: [PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.ManageMessages], color: '#00FF00' });
            await message.guild.roles.create({ name: '👥 Üye', permissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel], color: '#5865F2' });
            await message.guild.roles.create({ name: '👤 Misafir', permissions: [PermissionsBitField.Flags.ViewChannel], color: '#99AAB5' });

            if (type === 'Public Sunucusu') await message.guild.roles.create({ name: '⭐ VIP', color: '#FFD700' });
            if (type === 'Oyun Sunucusu') await message.guild.roles.create({ name: '🎮 Oyuncu', color: '#00FFFF' });
            if (type === 'Tasarım Sunucusu') await message.guild.roles.create({ name: '🎨 Designer', color: '#E91E63' });
            if (type === '+18 Sunucu') await message.guild.roles.create({ name: '🔞 Adult', color: '#8B0000' });
          } catch (err) { console.error('Rol oluşturma hatası:', err); }

          // 🔧 Kanallar (her tip için ayrı setup)
          try {
            // Normal Sunucu
            if (type === 'Normal Sunucu') {
              const normalCat = await message.guild.channels.create({ name: '📂 Genel', type: 4 });
              await message.guild.channels.create({ name: 'genel-sohbet', type: 0, parent: normalCat.id });
              await message.guild.channels.create({ name: 'sohbet-2', type: 0, parent: normalCat.id });
              await message.guild.channels.create({ name: 'medya', type: 0, parent: normalCat.id });
              await message.guild.channels.create({ name: 'bot-komut', type: 0, parent: normalCat.id });
              await message.guild.channels.create({ name: 'linkler', type: 0, parent: normalCat.id });
              await message.guild.channels.create({ name: 'anketler', type: 0, parent: normalCat.id });

              const voiceCat = await message.guild.channels.create({ name: '🔊 Ses Kanalları', type: 4 });
              await message.guild.channels.create({ name: 'Genel Ses', type: 2, parent: voiceCat.id });
              await message.guild.channels.create({ name: 'Müzik Odası', type: 2, parent: voiceCat.id });
              await message.guild.channels.create({ name: 'Oyun Ses', type: 2, parent: voiceCat.id });
              await message.guild.channels.create({ name: 'AFK', type: 2, parent: voiceCat.id });
              await message.guild.channels.create({ name: 'Sohbet Ses', type: 2, parent: voiceCat.id });
              await message.guild.channels.create({ name: 'Toplantı', type: 2, parent: voiceCat.id });

              const infoCat = await message.guild.channels.create({ name: '📌 Bilgilendirme', type: 4 });
              await message.guild.channels.create({ name: '📢 Duyurular', type: 0, parent: infoCat.id });
              await message.guild.channels.create({ name: '📜 Kurallar', type: 0, parent: infoCat.id });
              await message.guild.channels.create({ name: '📊 İstatistikler', type: 0, parent: infoCat.id });
              await message.guild.channels.create({ name: '📅 Etkinlikler', type: 0, parent: infoCat.id });
              await message.guild.channels.create({ name: '📌 Önemli Bilgiler', type: 0, parent: infoCat.id });

              const funCat = await message.guild.channels.create({ name: '🎉 Eğlence', type: 4 });
              await message.guild.channels.create({ name: 'meme', type: 0, parent: funCat.id });
              await message.guild.channels.create({ name: 'gif', type: 0, parent: funCat.id });
              await message.guild.channels.create({ name: 'ship', type: 0, parent: funCat.id });
              await message.guild.channels.create({ name: 'oyun-komut', type: 0, parent: funCat.id });
              await message.guild.channels.create({ name: 'espri', type: 0, parent: funCat.id });
              await message.guild.channels.create({ name: 'mini-oyunlar', type: 0, parent: funCat.id });
              await message.guild.channels.create({ name: 'şarkı-söz', type: 0, parent: funCat.id });
              await message.guild.channels.create({ name: 'anime-manga', type: 0, parent: funCat.id });

             const supportCat = await message.guild.channels.create({ name: '🛠️ Destek', type: 4 });
             await message.guild.channels.create({ name: 'yardım', type: 0, parent: supportCat.id });
             await message.guild.channels.create({ name: 'şikayet', type: 0, parent: supportCat.id });
             await message.guild.channels.create({ name: 'öneri', type: 0, parent: supportCat.id });
             await message.guild.channels.create({ name: 'destek-talep', type: 0, parent: supportCat.id });
             await message.guild.channels.create({ name: 'ticket-log', type: 0, parent: supportCat.id });

              const staffCat = await message.guild.channels.create({ name: '👑 Yönetim', type: 4 });
              await message.guild.channels.create({ name: 'admin-chat', type: 0, parent: staffCat.id });
              await message.guild.channels.create({ name: 'mod-chat', type: 0, parent: staffCat.id });
              await message.guild.channels.create({ name: 'staff-ses', type: 2, parent: staffCat.id });
              await message.guild.channels.create({ name: 'yönetim-duyuru', type: 0, parent: staffCat.id });
              await message.guild.channels.create({ name: 'loglar', type: 0, parent: staffCat.id });

              const archiveCat = await message.guild.channels.create({ name: '📦 Arşiv', type: 4 });
              await message.guild.channels.create({ name: 'eski-duyurular', type: 0, parent: archiveCat.id });
              await message.guild.channels.create({ name: 'eski-etkinlikler', type: 0, parent: archiveCat.id });
              await message.guild.channels.create({ name: 'arşiv-ses', type: 2, parent: archiveCat.id });
            }

            // Public Sunucusu
            if (type === 'Public Sunucusu') {
              const pubCat = await message.guild.channels.create({ name: '🌍 Public', type: 4 });
              await message.guild.channels.create({ name: 'tanışma', type: 0, parent: pubCat.id });
              await message.guild.channels.create({ name: 'selfie', type: 0, parent: pubCat.id });
              await message.guild.channels.create({ name: 'medya', type: 0, parent: pubCat.id });
              await message.guild.channels.create({ name: 'public-sohbet', type: 0, parent: pubCat.id });
              await message.guild.channels.create({ name: 'etkinlik-duyuru', type: 0, parent: pubCat.id });

              const pubVoice = await message.guild.channels.create({ name: '🔊 Public Ses', type: 4 });
              await message.guild.channels.create({ name: 'public-ses-1', type: 2, parent: pubVoice.id });
              await message.guild.channels.create({ name: 'public-ses-2', type: 2, parent: pubVoice.id });
              await message.guild.channels.create({ name: 'public-ses-3', type: 2, parent: pubVoice.id });
            }

            // +18 Sunucu
            if (type === '+18 Sunucu') {
              const adultCat = await message.guild.channels.create({ name: '🔞 Adult', type: 4 });
              await message.guild.channels.create({ name: 'adult-chat', type: 0, parent: adultCat.id });
              await message.guild.channels.create({ name: 'adult-media', type: 0, parent: adultCat.id });
              await message.guild.channels.create({ name: 'adult-meme', type: 0, parent: adultCat.id });

              const adultVoice = await message.guild.channels.create({ name: '🔊 Adult Ses', type: 4 });
              await message.guild.channels.create({ name: 'adult-ses-1', type: 2, parent: adultVoice.id });
              await message.guild.channels.create({ name: 'adult-ses-2', type: 2, parent: adultVoice.id });
            }

            // Oyun Sunucusu
            if (type === 'Oyun Sunucusu') {
              const gameCat = await message.guild.channels.create({ name: '🎮 Oyun', type: 4 });
              await message.guild.channels.create({ name: 'fps-oyunları', type: 0, parent: gameCat.id });
              await message.guild.channels.create({ name: 'moba-oyunları', type: 0, parent: gameCat.id });
              await message.guild.channels.create({ name: 'oyun-turnuvaları', type: 0, parent: gameCat.id });
              await message.guild.channels.create({ name: 'oyun-rehberleri', type: 0, parent: gameCat.id });

              const gameVoice = await message.guild.channels.create({ name: '🔊 Oyun Ses', type: 4 });
              await message.guild.channels.create({ name: 'oyun-ses-1', type: 2, parent: gameVoice.id });
              await message.guild.channels.create({ name: 'oyun-ses-2', type: 2, parent: gameVoice.id });
              await message.guild.channels.create({ name: 'oyun-ses-3', type: 2, parent: gameVoice.id });
            }

            // Tasarım Sunucusu
            if (type === 'Tasarım Sunucusu') {
              const designCat = await message.guild.channels.create({ name: '🎨 Tasarım', type: 4 });
              await message.guild.channels.create({ name: 'tasarım-paylaşım', type: 0, parent: designCat.id });
              await message.guild.channels.create({ name: 'renderler', type: 0, parent: designCat.id });
              await message.guild.channels.create({ name: 'stock-paylaşım', type: 0, parent: designCat.id });
              await message.guild.channels.create({ name: 'feedback', type: 0, parent: designCat.id });
              await message.guild.channels.create({ name: 'tasarım-sohbet', type: 0, parent: designCat.id });

              const designVoice = await message.guild.channels.create({ name: '🔊 Tasarım Ses', type: 4 });
              await message.guild.channels.create({ name: 'tasarım-ses-1', type: 2, parent: designVoice.id });
              await message.guild.channels.create({ name: 'tasarım-ses-2', type: 2, parent: designVoice.id });
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
                                                   
