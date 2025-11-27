const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports.run = async (client, message, args) => {
  try {
    // Yetki kontrolü
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Yetki Hatası')
            .setDescription('Bu komutu sadece **Yönetici** veya **Kanalları Yönet** yetkisine sahip olanlar kullanabilir.')
        ]
      });
    }

    if (!args[0]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Kullanım Hatası')
            .setDescription('Doğru kullanım: `g!kanalsil <#kanal | kanal-id>`')
        ]
      });
    }

    // Kanalı bul
    let kanal = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!kanal) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Kanal Bulunamadı')
            .setDescription('Belirtilen kanal bulunamadı. Lütfen geçerli bir kanal ID veya #kanal belirtin.')
        ]
      });
    }

    // Onay embed
    const confirmEmbed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('⚠️ Dikkat!')
      .setDescription(`Silmek istediğiniz kanal: ${kanal}\n\nOnaylıyor musunuz?\n\nOnay verilmediği taktirde işleminiz iptal edilecektir.`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('✅ Onaylıyorum').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel').setLabel('❌ İptal').setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 30000
    });

    collector.on('collect', async i => {
      if (i.customId === 'confirm') {
        try {
          await kanal.delete(`Silme işlemi ${message.author.tag} tarafından onaylandı.`);
          const doneEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Kanal Silindi')
            .setDescription(`Kanal başarıyla silindi: **${kanal.name}**`);

          await i.update({ embeds: [doneEmbed], components: [] });
        } catch (err) {
          console.error('Kanal silme hatası:', err);
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kanal silinirken bir hata oluştu.')
            ],
            components: []
          });
        }
        collector.stop();
      }

      if (i.customId === 'cancel') {
        const cancelEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ İşlem İptal Edildi')
          .setDescription('Kanal silme işlemi iptal edildi.');

        await i.update({ embeds: [cancelEmbed], components: [] });
        collector.stop();
      }
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
    console.error('kanalsil komutu hatası:', err);
    message.channel.send('⚠️ | Kanal silme sırasında bir hata oluştu.');
  }
};

module.exports.conf = { aliases: ['channeldelete', 'kanalsil'] };
module.exports.help = { name: 'kanalsil' };
