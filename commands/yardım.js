const { EmbedBuilder } = require('discord.js');

module.exports.run = async (client, message) => {
  try {
    const kategoriler = {
      genel: {
        title: '🔧 Genel Komutlar',
        value: '`g!ping`, `g!istatistik`, `g!uptime`, `g!yardım`'
      },
      kullanıcı: {
        title: '🎭 Kullanıcı Komutları',
        value: '`g!avatar`, `g!profil`, `g!emoji-bilgi`, `g!emojiler`'
      },
      moderasyon: {
        title: '🛡️ Moderasyon',
        value: '`g!ban`, `g!kick`, `g!sil`, `g!rol-ver`, `g!rol-al`, `g!uyar`'
      },
      sistem: {
        title: '📚 Sistem',
        value: '`g!sayaç`, `g!reklam-engel`, `g!küfür-engel`, `g!anti-raid`, `g!otorol`, `g!emoji-log`'
      }
    };

    const anaEmbed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('📖 Grave Yardım Menüsü')
      .setDescription('Aşağıdan kategori seçerek komutları görüntüleyebilirsin.')
      .setFooter({ text: 'g!komut-adı yazarak detaylı bilgi alabilirsin.' });

    const msg = await message.channel.send({ embeds: [anaEmbed] });

    const tepkiler = {
      '🔧': 'genel',
      '🎭': 'kullanıcı',
      '🛡️': 'moderasyon',
      '📚': 'sistem'
    };

    for (const emoji of Object.keys(tepkiler)) {
      await msg.react(emoji);
    }

    const filter = (reaction, user) =>
      Object.keys(tepkiler).includes(reaction.emoji.name) && user.id === message.author.id;

    const collector = msg.createReactionCollector({ filter, time: 30000 });

    collector.on('collect', async (reaction) => {
      const kategori = tepkiler[reaction.emoji.name];
      const embed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle(`📖 ${kategoriler[kategori].title}`)
        .setDescription(kategoriler[kategori].value)
        .setFooter({ text: 'g!komut-adı yazarak detaylı bilgi alabilirsin.' });

      await msg.edit({ embeds: [embed] });
      await reaction.users.remove(message.author.id);
    });

    collector.on('end', () => {
      msg.reactions.removeAll().catch(() => {});
    });
  } catch (err) {
    console.error('Yardım komutu hatası:', err);
    message.channel.send('❌ Yardım menüsü oluşturulurken bir hata oluştu.');
  }
};

module.exports.conf = {
  aliases: ['help', 'yardim']
};

module.exports.help = {
  name: 'yardım'
};
