const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const axios = require('axios');

module.exports.run = async (client, message, args) => {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('❌ Sesi dinletmem için kanalda olmalısın!');

  try {
    // Son 20 mesajı tara ve .pcm dosyasını bul
    const messages = await message.channel.messages.fetch({ limit: 20 });
    const audioMsg = messages.find(m => m.attachments.first() && m.attachments.first().name.endsWith('.pcm'));

    if (!audioMsg) return message.reply('❌ Yakın zamanda kaydedilmiş bir ses dosyası (.pcm) bulamadım!');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    const url = audioMsg.attachments.first().url;
    const response = await axios.get(url, { responseType: 'stream' });
    
    const player = createAudioPlayer();
    
    // Ham PCM verisi olduğunu belirtiyoruz
    const resource = createAudioResource(response.data, { 
        inputType: StreamType.Raw 
    });

    player.play(resource);
    connection.subscribe(player);

    message.reply('🔊 Ses kaydı oynatılıyor...');

    // Hata oluşursa oyuncuyu durdur ve kanaldan çık
    player.on('error', error => {
      console.error('Çalma Hatası:', error.message);
      connection.destroy();
    });

    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

  } catch (error) {
    console.error("Dinletme Hatası:", error);
    message.reply("❌ Ses oynatılırken bir hata oluştu.");
  }
};

module.exports.conf = { aliases: ['dinle'] };
module.exports.help = { name: 'ses-dinle' };
