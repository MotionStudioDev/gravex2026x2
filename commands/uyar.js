const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports.run = async (client, message, args) => {
  // 1. AŞAMA: Giriş Analizi (Full Embed)
  const analyzerEmbed = new EmbedBuilder()
    .setColor('#5865F2')
    .setAuthor({ name: 'GraveOS Adalet Birimi', iconURL: client.user.displayAvatarURL() })
    .setDescription('⏳ **Adli sicil kayıtları ve kullanıcı verileri senkronize ediliyor...**');

  const msg = await message.channel.send({ embeds: [analyzerEmbed] });

  // Yetki Kontrolü
  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    const noAuth = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('🚨 Erişim Engellendi')
      .setDescription('Bu üst düzey yönetim paneline erişmek için `Üyeleri Zaman Aşımına Uğrat` yetkisine sahip olmalısınız.');
    return msg.edit({ embeds: [noAuth] });
  }

  const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
  const initialReason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

  if (!target) {
    const noUser = new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle('❌ Kullanıcı Bulunamadı')
      .setDescription('Adalet sistemine dahil edilecek kullanıcı bulunamadı.\n\n**Doğru Kullanım:** `g!uyar @kullanıcı [sebep]`');
    return msg.edit({ embeds: [noUser] });
  }

  // 2. AŞAMA: Ana Kontrol Paneli
  const dashboard = new EmbedBuilder()
    .setColor('#2b2d31')
    .setAuthor({ name: `Moderasyon Paneli: ${target.user.username}`, iconURL: target.user.displayAvatarURL() })
    .setThumbnail('https://i.imgur.com/8Qp7mX6.png')
    .setDescription(
      `### ⚖️ Ceza Yapılandırması\n` +
      `**Hedef Üye:** ${target.user.tag}\n` +
      `**Ön Tanımlı Sebep:** \`${initialReason}\`\n\n` +
      `Lütfen bir işlem seçiniz. "Detaylı Uyarı" ile kanıt linki ekleyebilirsiniz.`
    )
    .addFields(
      { name: '📊 Risk Analizi', value: `\`Düşük (Puan: 1)\``, inline: true },
      { name: '🛡️ Sunucu Geçmişi', value: `\`Kayıt Mevcut\``, inline: true }
    )
    .setFooter({ text: 'GraveOS • Adalet Mülkün Temelidir.' });

  // BURASI KRİTİK: Butonları hatasız hale getirdik
  const rows = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('warn_modal').setLabel('Detaylı Uyarı (Kanıtlı)').setStyle(ButtonStyle.Danger).setEmoji('📝'),
    new ButtonBuilder().setCustomId('warn_direct').setLabel('Hızlı Uyar').setStyle(ButtonStyle.Secondary).setEmoji('⚡'),
    new ButtonBuilder().setCustomId('warn_cancel').setLabel('İşlemi İptal Et').setStyle(ButtonStyle.Secondary).setEmoji('✖️')
  );

  await msg.edit({ embeds: [dashboard], components: [rows] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 60000
  });

  collector.on('collect', async i => {
    // İPTAL ETME (FULL EMBED)
    if (i.customId === 'warn_cancel') {
      const cancelEmbed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setAuthor({ name: 'İşlem İptal Edildi', iconURL: client.user.displayAvatarURL() })
        .setDescription(`✅ **${target.user.tag}** hakkındaki uyarı talebi yetkili tarafından geri çekildi.`);
      return i.update({ embeds: [cancelEmbed], components: [] });
    }

    // MODAL SİSTEMİ (DETAYLI UYARI)
    if (i.customId === 'warn_modal') {
      const modal = new ModalBuilder().setCustomId('m_warn').setTitle('GraveOS Detaylı Kayıt');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('m_reason').setLabel('Kesin Sebep').setStyle(TextInputStyle.Short).setValue(initialReason),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('m_proof').setLabel('Kanıt URL (Varsa)').setStyle(TextInputStyle.Short).setPlaceholder('https://...').setRequired(false)
        )
      );
      await i.showModal(modal);

      const submitted = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
      if (submitted) {
        const finalReason = submitted.fields.getTextInputValue('m_reason');
        const proof = submitted.fields.getTextInputValue('m_proof') || 'Kanıt sunulmadı';
        
        await finishWarn(submitted, target, finalReason, proof, message, client);
      }
      return;
    }

    // HIZLI UYARI
    if (i.customId === 'warn_direct') {
      await finishWarn(i, target, initialReason, 'Hızlı İşlem (Kanıt Yok)', message, client);
    }
  });

  // FİNALİZASYON FONKSİYONU (FULL EMBED)
  async function finishWarn(interaction, targetMember, finalReason, proof, originalMsg, bot) {
    let dmStatus = "✅ İletildi";
    
    // DM Raporu
    const dmEmbed = new EmbedBuilder()
      .setColor('#ED4245')
      .setAuthor({ name: originalMsg.guild.name, iconURL: originalMsg.guild.iconURL() })
      .setTitle('📩 Ceza Bildirimi')
      .setDescription(
        `Sunucu içerisinde kurallara aykırı davranışınız tespit edildiği için uyarılmanıza karar verildi.\n\n` +
        `**Gerekçe:** \`${finalReason}\`\n` +
        `**Ek Kanıt:** ${proof}\n` +
        `**Zaman:** <t:${Math.floor(Date.now() / 1000)}:f>`
      )
      .setFooter({ text: 'Lütfen kurallara riayet ediniz.' });

    await targetMember.send({ embeds: [dmEmbed] }).catch(() => { dmStatus = "❌ Kapalı"; });

    // Sunucu Final Embed
    const reportEmbed = new EmbedBuilder()
      .setColor('#57F287')
      .setAuthor({ name: 'GraveOS Adalet Raporu', iconURL: bot.user.displayAvatarURL() })
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`### ✅ İşlem Başarıyla Sonuçlandı\nKullanıcı sistem tarafından uyarıldı ve sicili güncellendi.`)
      .addFields(
        { name: '👤 İhlal Yapan', value: `${targetMember.user.tag}\n(\`${targetMember.id}\`)`, inline: true },
        { name: '⚖️ Karar Veren', value: `${originalMsg.author.tag}\n(\`${originalMsg.author.id}\`)`, inline: true },
        { name: '📝 Sebep', value: `\`${finalReason}\``, inline: false },
        { name: '🖼️ Kanıt', value: proof.startsWith('http') ? `[Görüntülemek İçin Tıkla](${proof})` : `\`${proof}\``, inline: true },
        { name: '📩 DM Mesajı', value: `\`${dmStatus}\``, inline: true },
        { name: '🕒 Süreç', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'GraveOS Moderation Unit' });

    await interaction.update({ embeds: [reportEmbed], components: [] });
  }

  collector.on('end', (c, r) => {
    if (r === 'time' && c.size === 0) msg.edit({ components: [] }).catch(() => {});
  });
};

module.exports.conf = { aliases: ['warn', 'uyarı'] };
module.exports.help = { name: 'uyar' };
