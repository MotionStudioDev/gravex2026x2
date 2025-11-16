const { EmbedBuilder } = require('discord.js');

const küfürler = new Set(['salak', 'aptal', 'oç', 'amk', 'yarrak', 'piç', 'sik', 'orospu', 'ananı', 'göt']);

module.exports = async (message) => {
  if (!message.guild || message.author.bot) return;

  const client = message.client;
  const guildId = message.guild.id;

  if (!client.kufurEngel?.has(guildId)) return;

  const içerik = message.content.toLowerCase();
  const küfür = [...küfürler].find(k => içerik.includes(k));
  if (!küfür) return;

  try {
    await message.delete();

    // Kullanıcıya uyarı
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Küfür Tespit Edildi')
          .setDescription(`${message.author}, lütfen küfürlü mesajlar göndermeyin.`)
      ]
    });

    // Log embed
    const logKanalId = client.kufurLogKanalları?.get(guildId);
    const logKanal = logKanalId ? message.guild.channels.cache.get(logKanalId) : null;

    if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
      const logEmbed = new EmbedBuilder()
        .setColor('DarkRed')
        .setTitle('🛑 Küfür Logu')
        .addFields(
          { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: false },
          { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Küfür', value: `**${küfür}**`, inline: true },
          { name: 'Mesaj İçeriği', value: `\`\`\`${message.content}\`\`\``, inline: false },
          { name: 'Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: 'Küfür engel sistemi' });

      logKanal.send({ embeds: [logEmbed] });
    }
  } catch (err) {
    console.error('Küfür mesajı silinemedi veya log gönderilemedi:', err);
  }
};
