const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js"); // ActionRowBuilder ve ButtonBuilder eklendi

module.exports.run = async (client, message, args) => {
  const member =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.member;

  if (!member) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("🚫 Kullanıcı Bulunamadı")
          .setDescription("Belirttiğin kullanıcı bu sunucuda bulunamadı.")
      ]
    });
  }

  const user = member.user;
  const avatar = user.displayAvatarURL({ dynamic: true, size: 1024 });
  // Banner URL'si yoksa null döner, bu yüzden '||' kontrolü gerekli.
  const bannerURL = await user.fetch().then(u => u.bannerURL({ dynamic: true, size: 1024 }));
  const banner = bannerURL || "Yok";
  
  const nickname = member.nickname || "Yok";
  // Timestamp formatını kısaltalım, Embed'in daha temiz görünmesi için. (F: Tam tarih / R: Ne kadar süre önce)
  const joined = member.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
    : "Bilinmiyor";

  // ✅ Roller (Hiyerarşiye göre sıralayıp, limit koymak faydalı olabilir)
  const roles = member.roles.cache
    .filter(r => r.id !== message.guild.id)
    // En yüksek rolden başlayarak sırala
    .sort((a, b) => b.position - a.position) 
    .map(r => r.toString())
    .join(", ") || "Yok";
    
  // Roller listesi çok uzunsa keselim
  const rolesValue = roles.length > 1024 ? roles.substring(0, 1000) + '...' : roles;


  // ✅ Durum (presence)
  const statusMap = {
    online: "🟢 Çevrim içi",
    idle: "🌙 Boşta",
    dnd: "⛔ Rahatsız Etmeyin",
    offline: "⚫ Çevrim dışı"
  };
  // presence objesinin olup olmadığını kontrol etmek daha güvenlidir
  const presenceStatus = member.presence?.status || "offline";
  const durum = statusMap[presenceStatus];

  // ✅ Boost bilgisi
  const boosting = member.premiumSince
    ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>`
    : "Boost yok";
    
  // Hesap oluşturulma tarihini R formatında kullanalım
  const created = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;


  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(`👤 ${user.username} Profili`)
    .setThumbnail(avatar)
    .addFields(
      { name: "🆔 Kullanıcı ID", value: `\`${user.id}\``, inline: true }, // ID'yi daha okunur hale getirelim
      {
        name: "📅 Hesap Oluşturulma",
        value: created,
        inline: true
      },
      { name: "📅 Sunucuya Katılım", value: joined, inline: true },
      { name: "🎭 Kullanıcı Adı", value: user.tag, inline: true },
      { name: "🏷️ Sunucu Takma Adı", value: nickname, inline: true },
      { name: "💻 Durum", value: durum, inline: true },
      { name: "🚀 Boost Başlangıcı", value: boosting, inline: true },
      { name: "📌 Roller", value: rolesValue, inline: false },
    )
    .setFooter({ text: `Bilgileri gösteren: ${message.author.tag}` })
    .setTimestamp();

    
  // --- BUTON OLUŞTURMA ---
  const avatarButton = new ButtonBuilder()
    .setLabel('Avatarı Gör')
    .setStyle(ButtonStyle.Link)
    .setURL(avatar);

  const buttons = [avatarButton];

  // Eğer banner varsa, banner butonu ekle
  if (bannerURL) {
    const bannerButton = new ButtonBuilder()
      .setLabel('Bannerı Gör')
      .setStyle(ButtonStyle.Link)
      .setURL(bannerURL);
    buttons.push(bannerButton);
  }

  const row = new ActionRowBuilder().addComponents(buttons);
  
  // Embed ve Butonları gönder
  message.channel.send({ embeds: [embed], components: [row] });
};

module.exports.conf = {
  aliases: ["kullanıcı", "user", "info", "kb"]
};

module.exports.help = {
  name: "profil",
  description: "Belirtilen kullanıcının profil bilgilerini detaylı şekilde gösterir."
};
