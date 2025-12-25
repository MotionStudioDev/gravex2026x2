const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const ytext = require('youtube-ext');

module.exports.run = async (client, message, args) => {
  const sesKanali = message.member.voice.channel;
  if (!sesKanali) return message.reply("❌ Önce bir ses kanalına girmelisin!");

  const arama = args.join(" ");
  if (!arama) return message.reply("❌ Bir şarkı adı yazmalısın!");

  const loadingEmbed = new EmbedBuilder()
    .setColor('Yellow')
    .setDescription('⏳ YouTube üzerinde aranıyor...');

  const msg = await message.channel.send({ embeds: [loadingEmbed] });

  try {
    // YouTube'da arama yap ve videoyu bul
    const video = await ytext.videoInfo(arama); 
    if (!video) return msg.edit("❌ Şarkı bulunamadı!");

    // Ses akışını al (FFmpeg gerektirmez, youtube-ext halleder)
    const stream = await ytext.stream(video.url, { quality: 'high' });

    // Ses kanalına bağlan
    const connection = joinVoiceChannel({
      channelId: sesKanali.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    // Oynatıcıyı kur
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play }
    });

    player.play(resource);
    connection.subscribe(player);

    const resultEmbed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('🎬 YouTube Müzik Başlatıldı')
      .addFields(
        { name: '🎵 Şarkı', value: `\`${video.title}\``, inline: true },
        { name: '🕒 Süre', value: `\`${video.duration.timestamp}\``, inline: true }
      )
      .setThumbnail(video.thumbnails[0].url)
      .setFooter({ text: 'GraveBOT • FFmpeg ve Engel Olmadan' });

    await msg.edit({ embeds: [resultEmbed] });

    // Hata takibi
    player.on('error', error => {
      console.error(error);
      msg.edit("⚠️ Oynatıcıda bir hata oluştu.");
    });

  } catch (error) {
    console.error(error);
    if (error.message.includes('403')) {
        return msg.edit("❌ YouTube bu sunucunun IP adresini engelledi. Maalesef şu anlık YouTube üzerinden çalınamaz.");
    }
    await msg.edit("❌ Bir hata oluştu! Lütfen botun ses kanalı yetkilerini kontrol et.");
  }
};

module.exports.conf = { aliases: ['p', 'play', 'çal'] };
module.exports.help = { name: 'şarkı-çal' };
