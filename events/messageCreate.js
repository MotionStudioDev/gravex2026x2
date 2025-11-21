const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

const küfürler = ['amk','oç','yarrak','sik','piç','orospu','ananı','göt','salak','aptal'];
const reklamlar = ['discord.gg/','.gg/','http://','https://','.com','.net','.org'];

module.exports = async (message) => {
  if (!message.guild || message.author.bot) return;

  const client = message.client;
  const guildId = message.guild.id;
  const içerik = message.content.toLowerCase();

  // ✅ BOT ETİKET KONTROLÜ
  if (message.mentions.has(client.user) && message.content.trim() === `<@${client.user.id}>`) {
    const embed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('👋 Merhaba!')
      .setDescription('Beni etiketlemişsin.\nKomutlar için `g!yardım` yazabilirsin!')
      .setFooter({ text: 'GraveBOT 2026' });

    return message.channel.send({ embeds: [embed] });
  }

  // Sunucu ayarlarını DB’den çek
  const settings = await GuildSettings.findOne({ guildId });
  if (!settings) return;

  // ✅ KÜFÜR ENGEL
  if (settings.kufurEngel) {
    const küfür = küfürler.find(k => içerik.includes(k));
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
        setTimeout(() => uyarı.delete().catch(() => {}), 3000);

        const logKanalId = settings.kufurLog;
        const logKanal = logKanalId ? message.guild.channels.cache.get(logKanalId) : null;

        if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
          const logEmbed = new EmbedBuilder()
            .setColor('DarkRed')
            .setTitle('🛑 Küfür Logu')
            .addFields(
              { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})` },
              { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
              { name: 'Küfür', value: `**${küfür}**`, inline: true },
              { name: 'Mesaj İçeriği', value: `\`\`\`${message.content}\`\`\`` },
              { name: 'Zaman', value: `<t:${Math.floor(Date.now()/1000)}:F>` }
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
  if (settings.reklamEngel && reklamlar.some(r => içerik.includes(r))) {
    try {
      await message.delete();

      const logKanalId = settings.reklamLog;
      const logKanal = logKanalId ? message.guild.channels.cache.get(logKanalId) : message.channel;

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🚫 Reklam Mesajı Silindi')
        .addFields(
          { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})` },
          { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Mesaj İçeriği', value: `\`\`\`${message.content}\`\`\`` },
          { name: 'Zaman', value: `<t:${Math.floor(Date.now()/1000)}:F>` }
        )
        .setFooter({ text: 'Reklam engel sistemi' });

      if (logKanal && logKanal.permissionsFor(client.user).has('SendMessages')) {
        logKanal.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('Reklam mesajı silinemedi veya log gönderilemedi:', err);
    }
  }

  // ✅ SA-AS SİSTEMİ
  if (settings.saasAktif) {
    if (içerik === 'sa' || içerik.startsWith('sa ')) {
      message.reply('Aleyküm selam, Dostum.');
    }
  }
};
