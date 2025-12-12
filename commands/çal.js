const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const ffmpeg = require('ffmpeg-static');

module.exports.run = async (client, message, args) => {
  // 1. Kanal Kontrolü
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply("❌ Önce bir ses kanalına girmelisin!");

  const query = args.join(" ");
  if (!query) return message.reply("❓ Çalmak istediğin şarkının adını veya linkini yazmalısın.");

  // 2. Analiz Mesajı (Senin istediğin format)
  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ Şarkı analiz ediliyor ve bağlantı kuruluyor...');
  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    // 3. Şarkı Arama
    const searchResult = await play.search(query, { limit: 1 });
    if (searchResult.length === 0) return msg.edit({ content: "❌ Şarkı bulunamadı!" });
    const song = searchResult[0];

    // 4. Ses Bağlantısı ve Oynatıcı
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    // 5. Başarı Mesajı
    const resultEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🎶 Müzik Başlatıldı')
      .setThumbnail(song.thumbnails[0].url)
      .addFields(
        { name: 'Şarkı', value: `[${song.title}](${song.url})`, inline: false },
        { name: 'Süre', value: song.durationRaw, inline: true },
        { name: 'Kanal', value: voiceChannel.name, inline: true }
      )
      .setFooter({ text: 'İyi eğlenceler!' });

    await msg.edit({ embeds: [resultEmbed] });

    // Şarkı bittiğinde veya hata olduğunda çık
    player.on(AudioPlayerStatus.Idle, () => connection.destroy());
    player.on('error', error => console.error(error));

  } catch (err) {
    console.error(err);
    await msg.edit({ content: "❌ Bir hata oluştu! Render FFmpeg veya IP engeli yaşıyor olabilir." });
  }
};

module.exports.conf = { aliases: ['p', 'play'] };
module.exports.help = { name: 'çal' };
