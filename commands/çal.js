// Gerekli Kütüphaneler (Kurulu olmalıdır!)
const { 
    EmbedBuilder, 
    PermissionsBitField 
} = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus 
} = require('@discordjs/voice');
const ytdl = require('ytdl-core'); // Örnek olarak YouTube'dan çalmak için

// Global kuyruk (queue) yönetimi için basit bir Map kullanabiliriz
// Gerçek projelerde bu, daha kapsamlı bir kuyruk sınıfı olmalıdır.
const queue = new Map(); 

module.exports.run = async (client, message, args) => {
    
    // Ses kanalı ve komutu çalıştıran kullanıcı kontrolü
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.reply({ content: '❌ Müzik çalmak için bir ses kanalında olmalısınız!' });
    }

    // Botun ses kanalına katılma yetkisi kontrolü
    if (!voiceChannel.permissionsFor(message.client.user).has(PermissionsBitField.Flags.Connect)) {
        return message.reply({ content: '❌ Bu ses kanalına bağlanma yetkim yok!' });
    }

    const songQuery = args.join(" ");
    if (!songQuery) {
        return message.reply({ content: '❓ Lütfen çalmak istediğiniz şarkının adını veya YouTube linkini girin.' });
    }

    // Botun mevcut kuyruğunu (Queue) veya yenisini al
    const serverQueue = queue.get(message.guild.id);

    // YouTube linkini kontrol et ve şarkı bilgisini çek
    let songInfo;
    try {
        if (ytdl.validateURL(songQuery)) {
            // Direkt link ise
            songInfo = await ytdl.getInfo(songQuery);
        } else {
            // Arama sorgusu ise (Arama fonksiyonu burada olmalı, şimdilik basit bir varsayım)
            // NOT: discord.js ile doğrudan arama yapmak zordur. Genellikle 'youtube-search' veya benzeri bir paket kullanılır.
            // Bu örnekte, basitlik adına sorgunun kendisini link kabul edelim.
            const searchResults = await client.google.search({ queries: [`youtube ${songQuery}`] });
            const firstResult = JSON.parse(searchResults).organic_results?.[0];

            if (!firstResult || !firstResult.link || !ytdl.validateURL(firstResult.link)) {
                return message.reply({ content: '🔍 Aradığınız şarkı bulunamadı.' });
            }
            songInfo = await ytdl.getInfo(firstResult.link);
        }
    } catch (error) {
        console.error("Şarkı bilgisi çekilemedi:", error);
        return message.reply({ content: '❌ Şarkı bilgisi alınırken bir hata oluştu.' });
    }

    // Şarkı objesini oluştur
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        duration: formatDuration(songInfo.videoDetails.lengthSeconds),
        thumbnail: songInfo.videoDetails.thumbnails[0].url
    };

    // --- KUYRUK YÖNETİMİ ---

    if (!serverQueue) {
        // Yeni bir kuyruk oluştur
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            player: null,
            songs: [],
            volume: 5,
            playing: true,
        };

        queue.set(message.guild.id, queueContruct);
        queueContruct.songs.push(song);

        try {
            // Ses kanalına bağlan
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
            queueContruct.connection = connection;
            queueContruct.player = createAudioPlayer();
            connection.subscribe(queueContruct.player);

            // Çalmaya başla
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.error(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        // Şarkıyı mevcut kuyruğa ekle
        serverQueue.songs.push(song);
        const embed = new EmbedBuilder()
            .setColor('Purple')
            .setTitle('🎶 Kuyruğa Eklendi')
            .setDescription(`[${song.title}](${song.url}) şarkısı sıraya eklendi.`)
            .setThumbnail(song.thumbnail)
            .addFields(
                { name: 'Süre', value: song.duration, inline: true },
                { name: 'Sıra', value: `${serverQueue.songs.length - 1}`, inline: true }
            )
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }
};

// --- YARDIMCI FONKSİYONLAR ---

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        // Kuyruk bitti, ses kanalından ayrıl
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const resource = createAudioResource(ytdl(song.url, { filter: 'audioonly', quality: 'highestaudio' }));
    
    serverQueue.player.play(resource);

    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
        // Şarkı bittiğinde
        serverQueue.songs.shift(); // İlk şarkıyı kuyruktan çıkar
        play(guild, serverQueue.songs[0]); // Bir sonraki şarkıyı çal
    });
    
    serverQueue.player.on('error', error => {
        console.error(`Ses Oynatıcı Hatası: ${error.message}`);
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
    });


    // Şarkı çalmaya başladığında bildirim gönder
    const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('▶️ Şimdi Çalıyor')
        .setDescription(`[${song.title}](${song.url})`)
        .setThumbnail(song.thumbnail)
        .addFields(
            { name: 'Süre', value: song.duration, inline: true },
            { name: 'Kanal', value: `${serverQueue.voiceChannel}`, inline: true }
        )
        .setTimestamp();
    serverQueue.textChannel.send({ embeds: [embed] });
}

// Süreyi saniyeden HH:MM:SS formatına dönüştürür
function formatDuration(sec) {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}:`;
    result += `${minutes.toString().padStart(hours > 0 ? 2 : 1, '0')}:`;
    result += `${seconds.toString().padStart(2, '0')}`;
    
    return result;
}


module.exports.conf = {
    aliases: ['çal', 'oynat', 'g!play']
};

module.exports.help = {
    name: 'play'
};
