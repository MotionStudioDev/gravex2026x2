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

    if (args.length < 2) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Kullanım Hatası')
            .setDescription('Doğru kullanım: `g!kanalekle <kanal-adı> <tip>`\n\nTipler: `metin`, `ses`')
        ]
      });
    }

    const kanalAdi = args[0];
    const tip = args[1].toLowerCase();

    let kanalTipi;
    if (tip === 'metin') kanalTipi = 0; // text
    else if (tip === 'ses') kanalTipi = 2; // voice
    else {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Geçersiz Tip')
            .setDescription('Kanal tipi sadece `metin` veya `ses` olabilir.')
        ]
      });
    }

    // Onay embed
    const confirmEmbed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('⚠️ Dikkat!')
      .setDescription(`Eklenecek kanal: **${kanalAdi}**\nTip: **${tip}**\n\nOnaylıyor musunuz?\n\nOnay verilmediği taktirde işleminiz iptal edilecektir.`);

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
          const yeniKanal = await message.guild.channels.create({
            name: kanalAdi,
            type: kanalTipi,
            reason: `Kanal ${message.author.tag} tarafından eklendi`
          });

          const doneEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Kanal Eklendi')
            .setDescription(`Kanal başarıyla oluşturuldu: ${yeniKanal}`);

          await i.update({ embeds: [doneEmbed], components: [] });
        } catch (err) {
          console.error('Kanal ekleme hatası:', err);
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kanal eklenirken bir hata oluştu.')
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
          .setDescription('Kanal ekleme işlemi iptal edildi.');

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
    console.error('kanalekle komutu hatası:', err);
    message.channel.send('⚠️ | Kanal ekleme sırasında bir hata oluştu.');
  }
};

module.exports.conf = { aliases: ['channeladd', 'kanalekle'] };
module.exports.help = { name: 'kanalekle' };
