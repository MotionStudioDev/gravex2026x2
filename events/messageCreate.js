const { EmbedBuilder } = require('discord.js');
const db = require('orio.db');

const küfürler = new Set(['amk', 'oç', 'yarrak', 'sik', 'piç', 'orospu', 'ananı', 'göt', 'salak', 'aptal']);
const reklamlar = ['discord.gg/', '.gg/', 'http://', 'https://', '.com', '.net', '.org'];

module.exports = async (message) => {
  if (!message.guild || message.author.bot) return;

  const client = message.client;
  const guildId = message.guild.id;
  const içerik = message.content.toLowerCase();

  // ✅ KÜFÜR ENGEL
  if (client.kufurEngel?.has(guildId)) {
    const küfür = [...küfürler].find(k => içerik.includes(k));
    if (küfür) {
      try {
        await message.delete();

        const uyarı = await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('🚫 Küfür Tespit Edildi')
              .setDescription(`${message.author}, lütfen küfürlü mesajlar göndermeyin.`)
          ]
        });

        setTimeout(() => {
          uyarı.delete().catch(() => {});
        }, 3000);

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
    }
  }

  // ✅ REKLAM ENGEL
  const reklamAktif = db.get(`reklamEngel_${guildId}`);
  if (reklamAktif && reklamlar.some(r => içerik.includes(r))) {
    try {
      await message.delete();

      const logKanalId = client.reklamLogKanalları?.get(guildId);
      const logKanal = logKanalId ? message.guild.channels.cache.get(logKanalId) : message.channel;

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🚫 Reklam Mesajı Silindi')
        .addFields(
          { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: false },
          { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Mesaj İçeriği', value: `\`\`\`${message.content}\`\`\``, inline: false },
          { name: 'Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: 'Reklam engel sistemi' });

      if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
        logKanal.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('Reklam mesajı silinemedi veya log gönderilemedi:', err);
    }
  }
};
