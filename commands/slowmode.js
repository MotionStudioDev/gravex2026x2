const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType
} = require('discord.js');

module.exports.run = async (client, message, args) => {
  // 1. AŞAMA: Loading Embed (Giriş)
  const loadingEmbed = new EmbedBuilder()
    .setColor('#FFCC00')
    .setAuthor({ name: 'GraveOS | Sistem Başlatılıyor', iconURL: client.user.displayAvatarURL() })
    .setDescription('⏳ **Kanal verileri analiz ediliyor, lütfen bekleyin...**');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  // Yetki Kontrolü Embed
  if (!message.member.permissions.has('ManageChannels')) {
    const noAuth = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🚨 Yetki Reddedildi')
      .setDescription('Bu paneli kullanmak için `Kanalları Yönet` yetkisine sahip olmanız gerekmektedir.');
    return msg.edit({ embeds: [noAuth] });
  }

  const targetChannel = message.mentions.channels.first() || message.channel;

  // 2. AŞAMA: Dinamik Dashboard Oluşturucu
  const createDashboard = (seconds = null) => {
    const limit = seconds !== null ? seconds : targetChannel.rateLimitPerUser;
    let ui = { color: "#2B2D31", level: "Yok", bar: "▱▱▱▱▱▱▱▱▱▱", info: "Sohbet tamamen serbest." };

    if (limit > 0) ui = { color: "#57F287", level: "Düşük", bar: "▰▰▱▱▱▱▱▱▱▱", info: "Hafif spam koruması aktif." };
    if (limit > 15) ui = { color: "#FEE75C", level: "Orta", bar: "▰▰▰▰▰▱▱▱▱▱", info: "Sohbet akışı yavaşlatıldı." };
    if (limit > 60) ui = { color: "#E67E22", level: "Yüksek", bar: "▰▰▰▰▰▰▰▱▱▱", info: "Sıkı denetim uygulanıyor." };
    if (limit > 1800) ui = { color: "#ED4245", level: "Kritik", bar: "▰▰▰▰▰▰▰▰▰▰", info: "Kanal neredeyse kilitli." };

    return new EmbedBuilder()
      .setColor(ui.color)
      .setAuthor({ name: `${targetChannel.name} Yönetim Paneli`, iconURL: client.user.displayAvatarURL() })
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setDescription(
        `### ⚙️ Kanal Yapılandırması\n` +
        `Şu an bu kanalda mesaj gönderim hızı **${limit} saniye** olarak ayarlı.\n\n` +
        `**<:gvenlik:1416529478112383047> Koruma:** \`${ui.level}\`\n**<:duyuru:1416529617606414409> Durum:** \`${ui.info}\`\n` +
        `**<:hastag:1441378933181251654> Şiddet Grafiği:**\n> \`${ui.bar}\``
      )
      .addFields(
        { name: '<:ok1:1445126670687404143> Hedef Kanal', value: `<#${targetChannel.id}>`, inline: true },
        { name: '<:userx:1441379546929561650> Operatör', value: `${message.author.tag}`, inline: true }
      )
      .setFooter({ text: 'Seçim yapmak için menüyü veya butonları kullanın.' })
      .setTimestamp();
  };

  // Bileşenler (Menü ve Butonlar)
  const menuRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('sm_select_menu')
      .setPlaceholder('🚀 Bir hız modu belirleyin...')
      .addOptions([
        { label: 'Sınırsız (0s)', value: '0', emoji: '🔓' },
        { label: 'Hızlı Sohbet (5s)', value: '5', emoji: '💬' },
        { label: 'Standart Koruma (15s)', value: '15', emoji: '🛡️' },
        { label: 'Yavaşlatılmış (1dk)', value: '60', emoji: '⏳' },
        { label: 'Ağır Kısıtlama (15dk)', value: '900', emoji: '⚠️' },
        { label: 'Kanalı Dondur (6sa)', value: '21600', emoji: '🧊' },
      ])
  );

  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sm_modal_btn').setLabel('Özel Süre Gir').setStyle(ButtonStyle.Primary).setEmoji('⌨️'),
    new ButtonBuilder().setCustomId('sm_finish_btn').setLabel('Paneli Kapat').setStyle(ButtonStyle.Success).setEmoji('✅')
  );

  await msg.edit({ embeds: [createDashboard()], components: [menuRow, btnRow] });

  // Collector (Etkileşim Toplayıcı)
  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 300000 // 5 Dakika aktif kalır
  });

  collector.on('collect', async i => {
    // 3. AŞAMA: Paneli Kapatma (Full Embed)
    if (i.customId === 'sm_finish_btn') {
      const finalEmbed = new EmbedBuilder()
        .setColor('#2F3136')
        .setAuthor({ name: 'GraveOS | Panel Kapatıldı', iconURL: client.user.displayAvatarURL() })
        .setDescription(
          `### ✅ Ayarlar Kaydedildi\n` +
          `<#${targetChannel.id}> kanalı için yavaş mod yapılandırması başarıyla tamamlandı.\n\n` +
          `**Son Limit:** \`${targetChannel.rateLimitPerUser} Saniye\`\n` +
          `**İşlem Zamanı:** <t:${Math.floor(Date.now() / 1000)}:R>`
        )
        .setTimestamp();
      
      return i.update({ embeds: [finalEmbed], components: [] });
    }

    // 4. AŞAMA: Özel Süre (Modal)
    if (i.customId === 'sm_modal_btn') {
      const modal = new ModalBuilder().setCustomId('modal_slowmode').setTitle('Özel Hız Tanımla');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('modal_val')
          .setLabel('Saniye (0-21600 arası)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('Örn: 45')
      ));
      
      await i.showModal(modal);

      const modalSubmit = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
      if (modalSubmit) {
        const val = parseInt(modalSubmit.fields.getTextInputValue('modal_val'));
        
        if (isNaN(val) || val < 0 || val > 21600) {
          const errEmbed = new EmbedBuilder().setColor('Red').setDescription('❌ **Hata:** Lütfen 0 ile 21600 arasında geçerli bir sayı girin.');
          return modalSubmit.reply({ embeds: [errEmbed], ephemeral: true });
        }

        await targetChannel.setRateLimitPerUser(val);
        
        // Modal yanıtını da embed ile veriyoruz
        const successReply = new EmbedBuilder()
          .setColor('Green')
          .setDescription(`✅ Kanal hızı **${val} saniye** olarak güncellendi.`);
        
        await modalSubmit.reply({ embeds: [successReply], ephemeral: true });
        await msg.edit({ embeds: [createDashboard(val)] });
      }
      return;
    }

    // 5. AŞAMA: Menüden Seçim
    const selectedVal = parseInt(i.values[0]);
    await targetChannel.setRateLimitPerUser(selectedVal);
    
    // Paneli anlık güncelle (Yine Embed)
    await i.update({ embeds: [createDashboard(selectedVal)] });
  });

  collector.on('end', (_, reason) => {
    if (reason === 'time') {
      const timeoutEmbed = new EmbedBuilder().setColor('Red').setDescription('⚠️ **Zaman Aşımı:** Panel kullanım süresi dolduğu için kapatıldı.');
      msg.edit({ components: [] }).catch(() => {});
    }
  });
};

module.exports.conf = { aliases: ['sm-ultra', 'yavaş-mod-pro'] };
module.exports.help = { name: 'slowmode' };
