const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField, ComponentType } = require('discord.js');
const GuildSettings = require('../models/GuildSettings'); // Sunucu ayarları için
const SpamLog = require('../models/SpamLog'); // Kullanıcı sabıkaları için (Gerekirse otomatik temizlik için çağrılır)

module.exports.run = async (client, message, args) => {
  // 1. YETKİ KONTROLÜ
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("❌ Bu sistemi kurmak için **Yönetici** yetkisine sahip olmalısın!");
  }

  // 2. İLK AŞAMA: ONAY MESAJI
  const baslangicEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setTitle('⚠️ GraveOS | Güvenlik Yapılandırması')
    .setDescription('Sunucuda **Spam Koruması** aktif edilmek üzere!\n\n**Sistem Kuralları:**\n1️⃣. İhlalde: **10 Dakika Timeout**\n2️⃣. İhlalde: **DM Bildirimi + Sunucudan Ban**\n\nOnaylıyorsanız **EVET**, onaylamıyorsanız **HAYIR** tuşuna basınız.');

  const onaySatiri = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('spam_onay').setLabel('EVET').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('spam_red').setLabel('HAYIR').setStyle(ButtonStyle.Danger)
  );

  const anaMesaj = await message.channel.send({ embeds: [baslangicEmbed], components: [onaySatiri] });

  // Kolektör: Sadece komutu yazan kişi 60 saniye boyunca kullanabilir
  const filtre = i => i.user.id === message.author.id;
  const collector = anaMesaj.createMessageComponentCollector({ filter: filtre, time: 60000 });

  collector.on('collect', async (i) => {
    
    // REDDEDİLİRSE
    if (i.customId === 'spam_red') {
      await i.update({ content: '❌ Spam koruması kurulumu iptal edildi.', embeds: [], components: [] });
      return collector.stop();
    }

    // ONAYLANIRSA (KANAL SEÇİMİ)
    if (i.customId === 'spam_onay') {
      const yazıKanalları = message.guild.channels.cache
        .filter(c => c.type === 0) // Sadece yazı kanalları
        .first(25);

      if (yazıKanalları.length === 0) return i.reply({ content: "Sunucuda yazı kanalı bulamadım!", ephemeral: true });

      const kanalMenusu = new StringSelectMenuBuilder()
        .setCustomId('kanal_secimi')
        .setPlaceholder('Log kanalını kategoriden seçiniz...')
        .addOptions(
          yazıKanalları.map(kanal => ({
            label: `#${kanal.name}`,
            value: kanal.id,
            description: kanal.parent ? `${kanal.parent.name} kategorisinde` : 'Kategorisiz'
          }))
        );

      const menuSatiri = new ActionRowBuilder().addComponents(kanalMenusu);

      await i.update({
        content: '📢 **Spam koruma sistemi aktif edilmek üzere!**\nLütfen ihlallerin düşeceği **Log kanalını** aşağıdan seçiniz.',
        embeds: [],
        components: [menuSatiri]
      });
    }

    // KANAL SEÇİLDİĞİNDE
    if (i.customId === 'kanal_secimi') {
      const secilenKanalId = i.values[0];

      // MONGODB KAYDI (GuildSettings)
      await GuildSettings.findOneAndUpdate(
        { guildId: message.guild.id },
        { 
          spamSistemi: true, 
          spamLogKanali: secilenKanalId 
        },
        { upsert: true }
      );

      await i.update({
        content: `✅ **Tüm ayarlar kaydedildi.**\nSpam koruması aktif edildi ve log kanalı <#${secilenKanalId}> olarak belirlendi.`,
        components: []
      });
      
      collector.stop();
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      anaMesaj.edit({ content: '⌛ Süre dolduğu için işlem iptal edildi.', embeds: [], components: [] }).catch(() => {});
    }
  });
};

module.exports.conf = {
  aliases: ['spam-sistemi', 'spam-setup']
};

module.exports.help = {
  name: 'spamkoruması'
};
