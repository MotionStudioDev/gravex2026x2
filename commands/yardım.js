const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message, args) => {
  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle('Grave Yardım Menüsü')
    .setDescription('Aşağıda botun komutları kategorilere göre listelenmiştir.')
    .addFields(
      {
        name: '🔧 Genel Komutlar',
        value: '`g!ping`, `g!istatistik`, `g!uptime`, `g!yardım`',
        inline: false
      },
      {
        name: '🎭 Kullanıcı Komutları',
        value: '`g!avatar`, `g!profil`, `g!emoji-bilgi`', 
        inline: false
      },
      {
        name: '🛡️ Moderasyon',
        value: '`g!ban`, `g!kick`, `g!sil`, `g!rol-ver`, `g!rol-al`',
        inline: false
      },
      {
        name: '📚 Sistem',
        value: '`g!sayaç`, `g!küfür-engel`, `g!anti-raid`',
        inline: false
      }
    )
    .setFooter({ text: 'g!komut-adı yazarak detaylı bilgi alabilirsiniz.' });

  message.channel.send({ embeds: [embed] });
};

module.exports.conf = {
  aliases: ['help', 'yardim']
};

module.exports.help = {
  name: 'yardım'
};
