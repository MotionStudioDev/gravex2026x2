const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports.run = async (client, message, args) => {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Yetki Yok')
          .setDescription('Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.')
      ]
    });
  }

  const sub = args[0]?.toLowerCase();

  // Manuel kapatma argümanı
  if (sub === 'kapat') {
    await GuildSettings.findOneAndUpdate({ guildId: message.guild.id }, { levelSystemActive: false });
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Level Sistemi Kapatıldı')
          .setDescription('Artık sunucuda level sistemi devre dışı.')
      ]
    });
  }

  const settings = await GuildSettings.findOne({ guildId: message.guild.id });

  // ✅ Sistem zaten açıksa uyarı + Kapat butonu ve collector
  if (settings && settings.levelSystemActive) {
    const alreadyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('level_close').setLabel('Sistemi Kapat').setStyle(ButtonStyle.Danger)
    );

    const alreadyMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Orange')
          .setTitle('ℹ️ Level Sistemi Zaten Açık')
          .setDescription('Bu sunucuda level sistemi zaten aktif durumda.\nKapatmak için `g!level-sistemi kapat` yazabilir veya aşağıdaki butona basabilirsin.')
      ],
      components: [alreadyRow]
    });

    const alreadyCollector = alreadyMsg.createMessageComponentCollector({ time: 15000 });

    alreadyCollector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'Bu butonları sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
      }
      if (i.customId === 'level_close') {
        await GuildSettings.findOneAndUpdate({ guildId: message.guild.id }, { levelSystemActive: false });
        const closeEmbed = new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Level Sistemi Kapatıldı')
          .setDescription('Artık sunucuda level sistemi devre dışı.');
        await i.update({ embeds: [closeEmbed], components: [] });
      }
    });

    alreadyCollector.on('end', async () => {
      try {
        await alreadyMsg.edit({ components: [] });
      } catch {}
    });

    return; // burada bitiriyoruz; alttaki “EVET/HAYIR” akışına girmesin
  }

  // ✅ Sistem kapalıysa aç/kapat prompt’u
  const promptEmbed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle('📊 Level Sistemi')
    .setDescription('Sistemi açmak istiyor musunuz?');

  const promptRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('level_yes').setLabel('EVET').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('level_no').setLabel('HAYIR').setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [promptEmbed], components: [promptRow] });
  const collector = msg.createMessageComponentCollector({ time: 15000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id) {
      return i.reply({ content: 'Bu butonları sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
    }

    if (i.customId === 'level_yes') {
      await GuildSettings.findOneAndUpdate(
        { guildId: message.guild.id },
        { levelSystemActive: true },
        { upsert: true }
      );

      const yesEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Level Sistemi Aktif')
        .setDescription(
          'Level sistemi başarıyla açıldı.\n\n**Kullanılabilir Komutlar:**\n' +
          '📊 `g!level` → Kendi level bilgini gösterir\n' +
          '🏆 `g!level top` → Sunucudaki en yüksek level kullanıcılarını gösterir\n' +
          '⚙️ `g!level-sistemi kapat` → Sistemi kapatır'
        );

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('level_close').setLabel('Sistemi Kapat').setStyle(ButtonStyle.Danger)
      );

      await i.update({ embeds: [yesEmbed], components: [closeRow] });
    }

    if (i.customId === 'level_no') {
      const noEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Level Sistemi İptal Edildi')
        .setDescription('Level sistemi açılmadı.');
      await i.update({ embeds: [noEmbed], components: [] });
    }

    if (i.customId === 'level_close') {
      await GuildSettings.findOneAndUpdate({ guildId: message.guild.id }, { levelSystemActive: false });
      const closeEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Level Sistemi Kapatıldı')
        .setDescription('Artık sunucuda level sistemi devre dışı.');
      await i.update({ embeds: [closeEmbed], components: [] });
    }
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {}
  });
};

module.exports.conf = { aliases: ['levelsistemi'] };
module.exports.help = { name: 'level-sistemi', description: 'Sunucuda level sistemini aç/kapat.' };
