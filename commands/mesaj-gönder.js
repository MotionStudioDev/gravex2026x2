const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType 
} = require('discord.js');

const SAHIP_ID = "702901632136118273"; 
const LOG_KANAL_ID = "1416172498923294830"; // Logların gideceği kanal

module.exports.run = async (client, message, args) => {
  // Yetki Kontrolü
  if (message.author.id !== SAHIP_ID) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setDescription('❌ **Hata:** Bu komutu kullanmak için `Geliştirici` yetkisine sahip olmalısınız.')
      ]
    });
  }

  // İlk Panel: Formu açmak için buton gönderir
  const panelEmbed = new EmbedBuilder()
    .setColor('#5865F2')
    .setAuthor({ name: 'Mesaj Gönderim Paneli', iconURL: client.user.displayAvatarURL() })
    .setDescription('Aşağıdaki butona tıklayarak kullanıcıya DM gönderme formunu açabilirsiniz.')
    .setFooter({ text: 'İşlem yapmak için 60 saniyeniz var.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('dm_modal_ac')
      .setLabel('Mesaj Formunu Aç')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Primary)
  );

  const panelMsg = await message.channel.send({ embeds: [panelEmbed], components: [row] });

  // Buton Dinleyici
  const collector = panelMsg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId === 'dm_modal_ac') {
      
      // MODAL OLUŞTURMA
      const modal = new ModalBuilder()
        .setCustomId('dm_gonderim_formu')
        .setTitle('Kullanıcıya Mesaj Gönder');

      const idInput = new TextInputBuilder()
        .setCustomId('hedef_id_input')
        .setLabel("Hedef Kullanıcı ID")
        .setPlaceholder("ID buraya (Örn: 702901632136118273)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const textInput = new TextInputBuilder()
        .setCustomId('mesaj_icerik_input')
        .setLabel("Mesajınız")
        .setPlaceholder("İletmek istediğiniz notu yazın...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(idInput),
        new ActionRowBuilder().addComponents(textInput)
      );

      // Modal'ı kullanıcıya göster
      await interaction.showModal(modal);

      // Modal Yanıtını Yakala
      try {
        const submitted = await interaction.awaitModalSubmit({
          time: 60000,
          filter: (i) => i.customId === 'dm_gonderim_formu' && i.user.id === message.author.id,
        });

        if (submitted) {
          const targetID = submitted.fields.getTextInputValue('hedef_id_input');
          const finalContent = submitted.fields.getTextInputValue('mesaj_icerik_input');

          await submitted.deferReply({ ephemeral: true });

          try {
            const targetUser = await client.users.fetch(targetID);
            
            // Kullanıcıya giden mesaj
            const dmEmbed = new EmbedBuilder()
              .setColor('#2b2d31')
              .setAuthor({ name: 'Bot Sahibi Mesajı', iconURL: message.author.displayAvatarURL() })
              .setDescription(finalContent)
              .setFooter({ text: 'Bu mesaj bot sahibi tarafından iletildi.' })
              .setTimestamp();

            await targetUser.send({ embeds: [dmEmbed] });

            // Onay Mesajı (Sadece size görünür)
            await submitted.editReply({ 
              content: `✅ Mesaj başarıyla **${targetUser.tag}** kullanıcısına gönderildi.` 
            });

            // Log Kanalına Rapor Gönder
            const logKanal = client.channels.cache.get(LOG_KANAL_ID);
            if (logKanal) {
              const logEmbed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('📝 Modal DM Logu')
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                  { name: '👤 Alıcı', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                  { name: '📝 Mesaj', value: finalContent }
                )
                .setTimestamp();
              logKanal.send({ embeds: [logEmbed] });
            }

            // İlk paneli sil
            await panelMsg.delete().catch(() => {});

          } catch (err) {
            await submitted.editReply({ 
              content: `❌ **Hata:** Kullanıcı bulunamadı veya DM'i kapalı.` 
            });
          }
        }
      } catch (timeout) {
        // Modal doldurulmadan kapandıysa bir şey yapma
      }
    }
  });

  collector.on('end', () => {
    panelMsg.edit({ components: [] }).catch(() => {});
  });
};

module.exports.conf = {
  aliases: ['modal-dm', 'dm-at']
};

module.exports.help = {
  name: 'mesaj-gönder'
};
