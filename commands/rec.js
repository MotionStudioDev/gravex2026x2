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
      .setDescription('🎙️ **Kayıt Sistemi Hazır.** Konuşmaya başladığınızda kayıt yapılacak ve tek bir mesaj gönderilecek.');
    
    await message.channel.send({ embeds: [startEmbed] });

    // 🔥 KİLİT SİSTEMİ: Sadece bir kez tetiklenmesini sağlar
    let hasRecorded = false;

    connection.receiver.speaking.on('start', (userId) => {
      if (userId !== message.author.id || hasRecorded) return; 
      
      hasRecorded = true; // Kayıt başladı, kapıyı kapatıyoruz.

      const audioStream = connection.receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: 1500 },
      });

      const fileName = `./${userId}-${Date.now()}.pcm`;
      const out = fs.createWriteStream(fileName);
      const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

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
            .setDescription(`<@${userId}> sesin başarıyla kaydedildi. Dinlemek için butona tıkla!`)
            .setFooter({ text: 'Grave Ses Sistemleri.' });

          const finalMsg = await message.channel.send({
            embeds: [finishEmbed],
            components: [row],
            files: [{ attachment: fileName, name: `kayit-${userId}.pcm` }]
          });

          // Dosyayı temizle
          setTimeout(() => { if (fs.existsSync(fileName)) fs.unlink(fileName, () => {}); }, 5000);

          // Buton Collector
          const collector = finalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

          collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) return i.reply({ content: '❌ Sadece kaydı yapan kullanabilir.', ephemeral: true });

            if (i.customId === 'dinle_buton') {
              await i.deferUpdate();
              const currentVChannel = i.member.voice.channel;
              if (!currentVChannel) return i.followUp({ content: '❌ Ses kanalında olmalısın!', ephemeral: true });

              const playConn = joinVoiceChannel({
                channelId: currentVChannel.id,
                guildId: i.guild.id,
                adapterCreator: i.guild.voiceAdapterCreator,
              });

              const fileUrl = finalMsg.attachments.first().url;
              const response = await axios.get(fileUrl, { responseType: 'stream' });
              const player = createAudioPlayer();
              const resource = createAudioResource(response.data, { inputType: StreamType.Raw });

              player.play(resource);
              playConn.subscribe(player);
              player.on(AudioPlayerStatus.Idle, () => { setTimeout(() => playConn.destroy(), 1000); });
            }

            if (i.customId === 'sil_buton') {
              await finalMsg.delete().catch(() => {});
            }
          });
          
          // Kayıt bittikten sonra botu kanaldan çıkaralım (İsteğe bağlı)
          // connection.destroy();
        }
      });
    });

  } catch (error) {
    console.error(error);
    message.reply("❌ Sistem hatası oluştu.");
  }
};

module.exports.conf = { aliases: ['rec', 'kayit'] };
module.exports.help = { name: 'kaydet' };
