const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const ModLog = require('../models/modlog');

module.exports.run = async (client, message, args) => {
  // Yetki Kontrolü
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.channel.send({ content: "❌ Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın!" });
  }

  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Mod-Log ayarları hazırlanıyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

  // Butonlar
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('modlog_ayarla')
      .setLabel(channel ? 'Kanalı Onayla' : 'Mevcut Kanalı Temizle')
      .setStyle(channel ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('modlog_iptal')
      .setLabel('İşlemi İptal Et')
      .setStyle(ButtonStyle.Secondary)
  );

  const setupEmbed = new EmbedBuilder()
    .setColor('Blue')
    .setTitle('⚙️ Mod-Log Sistemi Yapılandırma')
    .setDescription(channel 
      ? `Mod-Log kanalını ${channel} olarak ayarlamak istiyor musunuz?` 
      : 'Sunucudaki mevcut Mod-Log kanalını sıfırlamak mı istiyorsunuz?')
    .setFooter({ text: 'Seçim yapmak için 30 saniyeniz var.' });

  await msg.edit({ embeds: [setupEmbed], components: [row] });

  const filter = i => i.user.id === message.author.id;
  const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

  collector.on('collect', async i => {
    if (i.customId === 'modlog_ayarla') {
      if (channel) {
        await ModLog.findOneAndUpdate(
          { guildID: message.guild.id },
          { logChannelID: channel.id },
          { upsert: true }
        );
        const successEmbed = new EmbedBuilder()
          .setColor('Green')
          .setTitle('✅ Başarılı')
          .setDescription(`Mod-Log kanalı başarıyla ${channel} olarak ayarlandı.`);
        await i.update({ embeds: [successEmbed], components: [] });
      } else {
        await ModLog.findOneAndDelete({ guildID: message.guild.id });
        const resetEmbed = new EmbedBuilder()
          .setColor('Orange')
          .setTitle('🗑️ Sıfırlandı')
          .setDescription('Mod-Log sistemi bu sunucu için devre dışı bırakıldı.');
        await i.update({ embeds: [resetEmbed], components: [] });
      }
    } else if (i.customId === 'modlog_iptal') {
      await i.update({ content: '❌ İşlem iptal edildi.', embeds: [], components: [] });
    }
  });
};

module.exports.conf = { aliases: ['mod-log', 'log-ayarla'] };
module.exports.help = { name: 'modlog' };
