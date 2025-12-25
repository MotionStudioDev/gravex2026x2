const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytSearch = require('yt-search');
const play = require('play-dl');

module.exports.run = async (client, message, args) => {
  const kanal = message.member.voice.channel;
  if (!kanal) return message.reply("❌ Önce bir ses kanalına girmelisin!");

  const arama = args.join(" ");
  if (!arama) return message.reply("❌ Bir şarkı adı yazmalısın!");

  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('🔍 YouTube üzerinde araştırılıyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    // 1. Adım: Arama yap (Bu kısım IP engeline takılmaz)
    const videoSonuc = await ytSearch(arama);
    const video = videoSonuc.videos[0];
    if (!video) return msg.edit("❌ Şarkı bulunamadı!");

    // 2. Adım: Sesi çek (Burada hata alma riskine karşı özel ayar)
    let stream;
    try {
      // discordPlayer: true ve quality: 0 ayarları Render gibi yerlerde daha stabil çalışır
      stream = await play.stream(video.url, { 
        discordPlayer: true,
        quality: 0 
      });
    } catch (e) {
      // Eğer yine "Sign in" hatası verirse kullanıcıya net bilgi verelim
      return msg.edit("⚠️ YouTube şu an botun bulunduğu sunucuyu engelliyor. Lütfen birkaç dakika sonra tekrar deneyin.");
    }

    // 3. Adım: Kanala bağlan
    const connection = joinVoiceChannel({
      channelId: kanal.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    // 4. Adım: Oynatıcıyı kur
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    const resultEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🎵 Grave Müzik Başladı')
      .addFields(
        { name: 'Şarkı', value: `\`${video.title}\``, inline: true },
        { name: 'Süre', value: `\`${video.timestamp}\``, inline: true }
      )
      .setThumbnail(video.thumbnail)
      .setFooter({ text: 'GraveBOT • FFmpeg Olmadan' });

    await msg.edit({ embeds: [resultEmbed] });

    player.on(AudioPlayerStatus.Idle, () => {
      // Şarkı bitince yapılacak işlemler buraya gelebilir
    });

  } catch (error) {
    console.error(error);
    await msg.edit("❌ Bir hata oluştu! Lütfen tekrar deneyin.");
  }
};

module.exports.conf = { aliases: ['p', 'play', 'çal'] };
module.exports.help = { name: 'şarkı-çal' };
