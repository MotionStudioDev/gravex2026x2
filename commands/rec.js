const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const prism = require('prism-media');

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

    message.reply('🎙️ Kayıt başladı. Konuşman bitince (sessiz kaldığında) otomatik yüklenecek...');

    connection.receiver.speaking.on('start', (userId) => {
      if (userId !== message.author.id) return;

      const audioStream = connection.receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: 1500 },
      });

      const fileName = `./${userId}.pcm`;
      const out = fs.createWriteStream(fileName);
      
      const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

      // 🔥 KRİTİK: Hata yönetimini ekleyerek botun çökmesini engelliyoruz
      opusDecoder.on('error', (err) => {
        console.error('⚠️ Opus Çözme Hatası (Veri bozuk olabilir, atlanıyor):', err.message);
      });

      audioStream.on('error', (err) => {
        console.error('⚠️ Audio Stream Hatası:', err.message);
      });

      // Stream zinciri
      audioStream.pipe(opusDecoder).pipe(out);

      out.on('finish', async () => {
        if (fs.existsSync(fileName)) {
          await message.channel.send({
            content: `✅ Kayıt tamamlandı! Dinlemek için: \`g!ses-dinle\``,
            files: [fileName]
          }).catch(() => {});
          
          // Dosyayı gönderdikten sonra temizle
          setTimeout(() => { if (fs.existsSync(fileName)) fs.unlinkSync(fileName); }, 5000);
        }
      });
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        connection.destroy();
    });

  } catch (error) {
    console.error("Bağlantı Hatası:", error);
    message.reply("❌ Ses kanalına bağlanırken bir hata oluştu.");
  }
};

module.exports.conf = { aliases: ['rec'] };
module.exports.help = { name: 'kaydet' };
