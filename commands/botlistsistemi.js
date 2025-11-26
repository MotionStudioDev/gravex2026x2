const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType
} = require('discord.js');
const BotList = require('../models/BotList');

module.exports.run = async (client, message, args) => {
  // Yalnızca Yönetici
  const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  if (!isAdmin) {
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Yetki yok').setDescription('Bu sistemi yalnızca **Yönetici** açabilir/kapatabilir.')]
    });
  }

  let data = await BotList.findOne({ guildId: message.guild.id });
  if (!data) data = await BotList.create({ guildId: message.guild.id });

  const sub = (args[0] || '').toLowerCase();

  // Ayar alt komutları (tek komutta hepsi)
  if (sub === 'log') {
    const ch = message.mentions.channels.first();
    if (!ch || ch.type !== ChannelType.GuildText)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Hatalı kullanım').setDescription('Metin kanalı etiketle: `g!botlist-sistemi log #kanal`')] });
    data.settings.logChannelId = ch.id;
    await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Log ayarlandı').setDescription(`Onay/Red log: <#${ch.id}>`)] });
  }

  if (sub === 'submit') {
    const ch = message.mentions.channels.first();
    if (!ch || ch.type !== ChannelType.GuildText)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Hatalı kullanım').setDescription('Metin kanalı etiketle: `g!botlist-sistemi submit #kanal`')] });
    data.settings.submitChannelId = ch.id;
    await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Başvuru kanalı ayarlandı').setDescription(`Bot ekleme kanalı: <#${ch.id}>`)] });
  }

  if (sub === 'botrol') {
    const role = message.mentions.roles.first();
    if (!role)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Hatalı kullanım').setDescription('Rol etiketle: `g!botlist-sistemi botrol @rol`')] });
    data.settings.botRoleId = role.id;
    await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Bot rolü ayarlandı').setDescription(`Bot rolü: <@&${role.id}>`)] });
  }

  if (sub === 'devrol') {
    const role = message.mentions.roles.first();
    if (!role)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Hatalı kullanım').setDescription('Rol etiketle: `g!botlist-sistemi devrol @rol`')] });
    data.settings.developerRoleId = role.id;
    await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Developer rolü ayarlandı').setDescription(`Developer: <@&${role.id}>`)] });
  }

  if (sub === 'staffrol') {
    const role = message.mentions.roles.first();
    if (!role)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Hatalı kullanım').setDescription('Rol etiketle: `g!botlist-sistemi staffrol @rol`')] });
    data.settings.staffRoleId = role.id;
    await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Yetkili rol ayarlandı').setDescription(`Onay yetkilisi: <@&${role.id}>`)] });
  }

  if (sub === 'limit') {
    const n = parseInt(args[1], 10);
    if (isNaN(n) || n < 1 || n > 10)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Hatalı kullanım').setDescription('Geçerli aralık: `1-10` → `g!botlist-sistemi limit <sayı>`')] });
    data.settings.botInviteLimit = n;
    await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Limit ayarlandı').setDescription(`Sunucuya onaylı bot limiti: **${n}**`)] });
  }

  if (sub === 'kapat') {
    if (!data.active) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle('⚠️ Zaten kapalı')] });
    }
    data.active = false;
    await data.save();
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('Green').setTitle('✅ Sistem kapatıldı').setDescription('Bot List Sistemi deaktif edildi.')] });
  }

  // Açıkken tekrar çağrılırsa uyarı
  if (!sub && data.active) {
    return message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor('Yellow')
        .setTitle('⚠️ Sistem zaten aktif')
        .setDescription(
          '**Ayarlar (tek komut içinde):**\n' +
          '`g!botlist-sistemi log #kanal`\n' +
          '`g!botlist-sistemi submit #kanal`\n' +
          '`g!botlist-sistemi botrol @rol`\n' +
          '`g!botlist-sistemi devrol @rol`\n' +
          '`g!botlist-sistemi staffrol @rol`\n' +
          '`g!botlist-sistemi limit <sayı>`\n' +
          '`g!botlist-sistemi kapat`'
        )
      ]
    });
  }

  // İlk kurulum promptu (EVET/HAYIR)
  const promptEmbed = new EmbedBuilder()
    .setColor('Blue')
    .setTitle('🤖 Bot List Sistemi')
    .setDescription('Bot List sistemini aktif etmek istiyor musun?');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bl_yes_${message.guild.id}`).setLabel('EVET').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`bl_no_${message.guild.id}`).setLabel('HAYIR').setStyle(ButtonStyle.Danger)
  );

  await message.channel.send({ embeds: [promptEmbed], components: [row] });
};

module.exports.conf = { aliases: ['botlist'] };
module.exports.help = { name: 'botlist-sistemi' };
