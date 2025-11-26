const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: "AIzaSyAGwSxAi53QUpeqoFNCtpvH-z3XYxzmy3U" });

module.exports.run = async (client, message, args) => {
  try {
    if (args.length < 2) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Kullanım Hatası')
            .setDescription('Doğru kullanım: `g!çeviri <metin> <hedef-dil>`\n\nÖrnek: `g!çeviri merhaba ingilizce`')
        ]
      });
    }

    const metin = args[0];
    const hedefDil = args[1].toLowerCase();

    const ceviri = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: `"${metin}" metnini ${hedefDil} diline çevir. Sadece çeviriyi yaz, başka bir şey yazma.`,
      config: {
        systemInstruction: 'Sadece çeviriyi yaz, başka bir şey yazma.',
      },
    });

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🌐 Çeviri')
      .addFields(
        { name: '📝 Orijinal Metin', value: metin },
        { name: `🔄 ${hedefDil.charAt(0).toUpperCase() + hedefDil.slice(1)} Çevirisi`, value: ceviri.text }
      )
      .setFooter({
        text: message.author.tag,
        iconURL: message.author.displayAvatarURL()
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev_dm').setLabel('Önceki DM').setStyle(ButtonStyle.Primary).setEmoji('⬅️'),
      new ButtonBuilder().setCustomId('detay').setLabel('Detay').setStyle(ButtonStyle.Success).setEmoji('📊'),
      new ButtonBuilder().setCustomId('yeniden_cevir').setLabel('Yeniden Çevir').setStyle(ButtonStyle.Secondary).setEmoji('🔁'),
      new ButtonBuilder().setCustomId('next_dm').setLabel('Sonraki DM').setStyle(ButtonStyle.Primary).setEmoji('➡️')
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 30000
    });

    collector.on('collect', async i => {
      if (i.customId === 'yeniden_cevir') {
        const yeniCeviri = await ai.models.generateContent({
          model: 'gemini-2.0-flash-001',
          contents: `"${metin}" metnini ${hedefDil} diline yeniden çevir. Sadece çeviriyi yaz, başka bir şey yazma.`,
          config: {
            systemInstruction: 'Sadece çeviriyi yaz, başka bir şey yazma.',
          },
        });

        const newEmbed = EmbedBuilder.from(embed).spliceFields(1, 1, {
          name: `🔄 ${hedefDil.charAt(0).toUpperCase() + hedefDil.slice(1)} Çevirisi`,
          value: yeniCeviri.text
        });

        await i.update({ embeds: [newEmbed], components: [row] });
      }

      else if (i.customId === 'detay') {
        const detay = await ai.models.generateContent({
          model: 'gemini-2.0-flash-001',
          contents: `"${metin}" metni neden böyle çevrildi? Dilsel ve yapısal olarak kısa bir açıklama yap.`,
          config: {
            systemInstruction: 'Sadece açıklama yap, başka bir şey yazma.',
          },
        });

        const detayEmbed = new EmbedBuilder()
          .setColor('#43B581')
          .setTitle('📊 Çeviri Detayı')
          .setDescription(detay.text)
          .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();

        await i.reply({ embeds: [detayEmbed], ephemeral: true });
      }

      else {
        await i.deferUpdate(); // placeholder butonlar
      }
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );
      await msg.edit({ components: [disabledRow] }).catch(() => {});
    });

  } catch (error) {
    console.error('Çeviri hatası:', error);
    await message.channel.send('❌ Çeviri yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
  }
};

module.exports.conf = { aliases: ['translate', 'ceviri'] };
module.exports.help = { name: 'çeviri' };
