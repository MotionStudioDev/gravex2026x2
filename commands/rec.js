const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType 
} = require('discord.js');
const { 
    joinVoiceChannel, EndBehaviorType, VoiceConnectionStatus, 
    createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus 
} = require('@discordjs/voice');
const fs = require('fs');
const prism = require('prism-media');
const axios = require('axios');

module.exports.run = async (client, message, args) => {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('❌ Bir ses kanalında olmalısın!');

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    const startEmbed = new EmbedBuilder()
      .setColor('Yellow')
      .setDescription('🎙️ **Kayıt Hazır.** Konuştuğunuzda kayıt alınacak ve mesaj **20 saniye** sonra otomatik silinecektir.');
    
    await message.channel.send({ embeds: [startEmbed] });

    let hasRecorded = false; // Tek seferlik kayıt kilidi

    connection.receiver.speaking.on('start', (userId) => {
      if (userId !== message.author.id || hasRecorded) return; 
      
      hasRecorded = true; 

      const audioStream = connection.receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: 1500 },
      });

      const fileName = `./${userId}-${Date.now()}.pcm`;
      const out = fs.createWriteStream(fileName);
      const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

      // Hata yakalayıcılar (Çökmeyi önler)
      audioStream.on('error', (err) => console.error('⚠️ Akış Hatası:', err.message));
      opusDecoder.on('error', (err) => console.error('⚠️ Çözücü Hatası:', err.message));

      audioStream.pipe(opusDecoder).pipe(out);

      out.on('finish', async () => {
        if (fs.existsSync(fileName)) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('dinle_buton')
              .setLabel('Sesi Dinle')
              .setEmoji('🔊')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('sil_buton')
              .setLabel('Mesajı Sil')
              .setStyle(ButtonStyle.Danger)
          );

          const finishEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Kayıt Tamamlandı')
            .setDescription(`<@${userId}> sesin kaydedildi. **Bu mesaj ve dosya 20 saniye sonra silinecek.**`)
            .setFooter({ text: 'Süre bitmeden dinleyebilirsiniz.' });

          const finalMsg = await message.channel.send({
            embeds: [finishEmbed],
            components: [row],
            files: [{ attachment: fileName, name: `kayit-${userId}.pcm` }]
          });

          // 🔥 20 Saniye Sonra Mesajı ve Dosyayı Temizle
          const autoDelete = setTimeout(() => {
            finalMsg.delete().catch(() => {});
            if (fs.existsSync(fileName)) {
              fs.unlink(fileName, () => {});
            }
          }, 20000);

          const collector = finalMsg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 20000 
          });

          collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) {
              return i.reply({ content: '❌ Bu butonu sadece kaydı yapan kullanabilir.', ephemeral: true });
            }

            if (i.customId === 'dinle_buton') {
              await i.deferUpdate();
              const currentVChannel = i.member.voice.channel;
              if (!currentVChannel) return i.followUp({ content: '❌ Sesi dinlemek için bir ses kanalında olmalısın!', ephemeral: true });

              const playConn = joinVoiceChannel({
                channelId: currentVChannel.id,
                guildId: i.guild.id,
                adapterCreator: i.guild.voiceAdapterCreator,
              });

              try {
                const fileUrl = finalMsg.attachments.first().url;
                const response = await axios.get(fileUrl, { responseType: 'stream' });
                
                const player = createAudioPlayer();
                const resource = createAudioResource(response.data, { inputType: StreamType.Raw });

                player.play(resource);
                playConn.subscribe(player);

                player.on(AudioPlayerStatus.Idle, () => {
                  setTimeout(() => { if (playConn) playConn.destroy(); }, 1000);
                });

                player.on('error', (e) => console.error('Oynatma Hatası:', e));
              } catch (playErr) {
                console.error("Dinletme hatası:", playErr);
              }
            }

            if (i.customId === 'sil_buton') {
              clearTimeout(autoDelete); // Manuel silinirse zamanlayıcıyı iptal et
              await finalMsg.delete().catch(() => {});
              if (fs.existsSync(fileName)) fs.unlink(fileName, () => {});
            }
          });
        }
      });
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        try { connection.destroy(); } catch (e) {}
    });

  } catch (error) {
    console.error("Ana Hata:", error);
    message.reply("❌ Bir hata oluştu.");
  }
};

module.exports.conf = {
  aliases: ['rec', 'kayit']
};

module.exports.help = {
  name: 'kaydet'
};
