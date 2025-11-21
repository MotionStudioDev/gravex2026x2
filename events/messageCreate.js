const { EmbedBuilder } = require('discord.js');
const db = require('orio.db');

const küfürler = new Set(['amk', 'oç', 'yarrak', 'sik', 'piç', 'orospu', 'ananı', 'göt', 'salak', 'aptal']);
const reklamlar = ['discord.gg/', '.gg/', 'http://', 'https://', '.com', '.net', '.org'];

module.exports = async (message) => {
  if (!message.guild || message.author.bot) return;

  const client = message.client;
  const guildId = message.guild.id;
  const içerik = message.content.toLowerCase();

  // BOT ETİKET KONTROLÜ
  if (message.mentions.has(client.user) && message.content.trim() === `<@${client.user.id}>`) {
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('👋 Merhaba!')
        .setDescription('Beni etiketlemişsin.\nKomutlar için `g!yardım` yazabilirsin!')
        .setFooter({ text: 'GraveBOT 2026' })]
    });
  }

  // KÜFÜR ENGEL
  const kufurAktif = db.get(`kufurEngel_${guildId}`);
  if (kufurAktif) {
    const küfür = [...küfürler].find(k => içerik.includes(k));
    if (küfür) {
      try {
        await message.delete();

        const uyarı = await message.channel.send({
          embeds: [new EmbedBuilder()
            .setColor('Red')
            .setTitle('🚫 Küfür Tespit Edildi')
            .setDescription(`${message.author}, lütfen küfürlü mesajlar göndermeyin.`)]
        });

        setTimeout(() => uyarı.delete().catch(() => {}), 3000);

        const logKanalId = db.get(`kufurLog_${guildId}`);
        const logKanal = logKanalId ? message.guild.channels.cache.get(logKanalId) : null;

        if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
          logKanal.send({
            embeds: [new EmbedBuilder()
              .setColor('DarkRed')
              .setTitle('🛑 Küfür Logu')
              .addFields(
                { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: false },
                { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Küfür', value: `**${küfür}**`, inline: true },
                { name: 'Mesaj İçeriği', value: `\`\`\`${message.content}\`\`\``, inline: false },
                { name: 'Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
              )
              .setFooter({ text: 'Küfür engel sistemi' })]
          });
        }
      } catch (err) { console.error(err); }
    }
  }

  // REKLAM ENGEL
  const reklamAktif = db.get(`reklamEngel_${guildId}`);
  if (reklamAktif && reklamlar.some(r => içerik.includes(r))) {
    try {
      await message.delete();

      const logKanalId = db.get(`reklamLog_${guildId}`) || message.channel.id;
      const logKanal = message.guild.channels.cache.get(logKanalId);

      if (!logKanal) return;

      logKanal.send({
        embeds: [new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Reklam Mesajı Silindi')
          .addFields(
            { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: false },
            { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Mesaj İçeriği', value: `\`\`\`${message.content}\`\`\``, inline: false },
            { name: 'Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: 'Reklam engel sistemi' })]
      });
    } catch (err) { console.error(err); }
  }
};
