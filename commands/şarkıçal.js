const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

module.exports.run = async (client, message, args) => {
  const kanal = message.member.voice.channel;
  if (!kanal) return message.reply("❌ Önce bir ses kanalına girmelisin!");

  const arama = args.join(" ");
  if (!arama) return message.reply("❌ Bir şarkı adı veya link girmelisin!");

  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Lütfen bekleyin, ses verisi çekiliyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    // Şarkıyı Ara
    let yt_info = await play.search(arama, { limit: 1 });
    if (!yt_info.length) return msg.edit("❌ Şarkı bulunamadı!");

    // Sesi Al (FFmpeg gerektirmez, play-dl halleder)
    let stream = await play.stream(yt_info[0].url);

    // Kanala Bağlan
    const connection = joinVoiceChannel({
      channelId: kanal.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    // Oynatıcıyı Hazırla
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    const resultEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('📡 Müzik Başlatıldı')
      .addFields(
        { name: 'Şarkı', value: `\`${yt_info[0].title}\``, inline: true },
        { name: 'Süre', value: `\`${yt_info[0].durationRaw}\``, inline: true }
      )
      .setFooter({ text: 'GraveBOT • FFmpeg Olmadan Çalışıyor' });

    await msg.edit({ embeds: [resultEmbed] });

    // Şarkı bitince kanaldan çıkma (opsiyonel)
    player.on(AudioPlayerStatus.Idle, () => {
      // connection.destroy(); // İstersen bunu açabilirsin
    });

  } catch (error) {
    console.error(error);
    await msg.edit("❌ Bir hata oluştu! Botun gerekli izinleri olduğundan emin ol.");
  }
};

module.exports.conf = {
  aliases: ['p', 'play', 'çal']
};

module.exports.help = {
  name: 'şarkı-çal'
};
