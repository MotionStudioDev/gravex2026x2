const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType } = require('@discordjs/voice');
const fs = require('fs');
const prism = require('prism-media');

module.exports.run = async (client, message, args) => {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('❌ Bir ses kanalında olmalısın!');

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

    audioStream.pipe(opusDecoder).pipe(out);

    out.on('finish', async () => {
      await message.channel.send({
        content: `✅ Kayıt tamamlandı! Dinlemek için bu dosyayı bilgisayarda Audacity ile açabilir veya botun dinletmesini bekleyebilirsin.`,
        files: [fileName]
      });
      fs.unlinkSync(fileName); // Dosyayı gönderdikten sonra siliyoruz (yer kaplamasın)
    });
  });
};

module.exports.conf = { aliases: ['rec'] };
module.exports.help = { name: 'kaydet' };
