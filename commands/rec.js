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
      .setDescription('🎙️ **Kayıt Sistemi Aktif.** Konuşmaya başladığınızda kayıt alınacak (Sadece 1 kez).');
    
    await message.channel.send({ embeds: [startEmbed] });

    let hasRecorded = false; // Tek seferlik kayıt kontrolü

    connection.receiver.speaking.on('start', (userId) => {
      if (userId !== message.author.id || hasRecorded) return; 
      
      hasRecorded = true; 

      const audioStream = connection.receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: 1500 },
      });

      const fileName = `./${userId}-${Date.now()}.pcm`;
      const out = fs.createWriteStream(fileName);
      const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

      // 🔥 ŞİFRELEME VE AKIŞ HATALARINI YAKALAMA (ÇÖKMEYİ ENGELLER)
      audioStream.on('error', (err) => {
        console.error('⚠️ Ses Akış Hatası (Paket Atlandı):', err.message);
      });

      opusDecoder.on('error', (err) => {
        console.error('⚠️ Çözücü Hatası:', err.message);
      });

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
            .setDescription(`<@${userId}> sesin başarıyla kaydedildi. Dinlemek için aşağıdaki butona tıkla!`)
            .setFooter({ text: 'Tek seferlik kayıt modunda çalıştı.' });

          const finalMsg = await message.channel.send({
            embeds: [finishEmbed],
            components: [row],
            files: [{ attachment: fileName, name: `kayit-${userId}.pcm` }]
          });

          // Dosyayı sunucudan güvenli silme
          setTimeout(() => { 
            if (fs.existsSync(fileName)) {
                fs.unlink(fileName, (err) => { if(err) console.log("Silme hatası:", err.message); });
            }
          }, 10000);

          // Buton Collector
          const collector = finalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

          collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) return i.reply({ content: '❌ Bu butonu sadece kaydı yapan kullanabilir.', ephemeral: true });

            if (i.customId === 'dinle_buton') {
              await i.deferUpdate();
              
              const currentVChannel = i.member.voice.channel;
              if (!currentVChannel) return i.followUp({ content: '❌ Ses kanalında olmalısın!', ephemeral: true });

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
              await finalMsg.delete().catch(() => {});
            }
          });
        }
      });
    });

    // Bağlantı koptuğunda temizle
    connection.on(VoiceConnectionStatus.Disconnected, () => {
        try { connection.destroy(); } catch (e) {}
    });

  } catch (error) {
    console.error("Ana Hata:", error);
    message.reply("❌ Sistem hatası oluştu. Lütfen botu tekrar başlatın.");
  }
};

module.exports.conf = {
  aliases: ['rec', 'kayit']
};

module.exports.help = {
  name: 'kaydet'
};
