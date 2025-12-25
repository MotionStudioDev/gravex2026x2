/*=======================================================================================*/

  /**
 * Modüller
 */

const {PermissionsBitField, EmbedBuilder, ButtonStyle, Client, GatewayIntentBits, ChannelType, Partials, ActionRowBuilder, SelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, SelectMenuInteraction, ButtonBuilder } = require("discord.js");
const { Collection } = require("discord.js");
const config = require("./config.js");
const fs = require("fs");
const db = require("orio.db");
const Discord = require("discord.js")
const moment = require('moment')
require('moment-duration-format')
moment.locale('tr')
/*=======================================================================================*/
/////////////////////MONGO 
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB’ye bağlanıldı!"))
  .catch(err => console.error("❌ MongoDB bağlantı hatası:", err));

/*=======================================================================================*/

  /**
 * Clients
 */

const client = new Client({
  partials: [
    Partials.Message, // Mesaj
    Partials.Channel, // Yazı kanalı
    Partials.GuildMember, // Sunucu üyesi
    Partials.Reaction, // Emoji mesajı
    Partials.GuildScheduledEvent, // Sunucu etkinliği
    Partials.User, // Discord üyesi
    Partials.ThreadMember, // Konu üyesi
  ],
  intents: [
    GatewayIntentBits.Guilds, // Sunucu ile ilgili şeyler 
    GatewayIntentBits.GuildMembers, // Sunucu üyeleri için ilgili şeyler
    GatewayIntentBits.GuildBans, // Sunucu yasaklarını yönetmek için
    GatewayIntentBits.GuildEmojisAndStickers, // Emojileri ve çıkartmaları yönetmek
    GatewayIntentBits.GuildIntegrations, // Discord Entegrasyonları
    GatewayIntentBits.GuildWebhooks, // Discord web kancaları
    GatewayIntentBits.GuildInvites, // Sunucu davet yönetimi için
    GatewayIntentBits.GuildVoiceStates, // Ses kanallarının yönetimi
    GatewayIntentBits.GuildPresences, // Sunucu sâhipliğinin yönetimi
    GatewayIntentBits.GuildMessages, // Sunucu mesajlarının yönetimi
    GatewayIntentBits.GuildMessageReactions, // Mesaj emojilerinin yönetimi
    GatewayIntentBits.GuildMessageTyping, // Mesaj yazmanın yönetimi
    GatewayIntentBits.DirectMessages, // Özel mesaj
    GatewayIntentBits.DirectMessageReactions, // Özel mesaj emojisi
    GatewayIntentBits.DirectMessageTyping, // Özel mesaj yazmak 
    GatewayIntentBits.MessageContent, // Mesaj içeriğine ihtiyacınız varsa etkinleştirin
  ],
});

module.exports = client;
/*=======================================================================================*/

  /**
 * Events loader.
 */
client.sayaçlar = new Map();
client.sayaçKanalları = new Map();

client.kufurEngel = new Map();        // guildId → true/false
client.kufurLogKanalları = new Map(); // guildId → kanalId

client.antiRaid = new Map();                   // guildId → { aktif: true, eşik: 5, süre: 10 }
client.antiRaidLogKanalları = new Map();       // guildId → kanalId
client.antiRaidGirişler = new Map();           // guildId → [timestamp1, timestamp2, ...]

client.emojiLogKanalları = new Map(); // guildId → kanalId
client.sesLogKanalları = new Map(); // guildId → kanalId
client.otoroller = new Map();           // guildId → rolId
client.otorolLogKanalları = new Map();  // guildId → kanalId
client.reklamLogKanalları = new Map(); // guildId → kanalId

client.on('interactionCreate', (interaction) => {
    require('./events/interactionCreate')(client, interaction);
});
require('./events/modlog')(client);
client.on('emojiCreate', require('./events/emojiCreate'));
client.on('emojiDelete', require('./events/emojiDelete'));
client.on('emojiUpdate', require('./events/emojiUpdate'));

client.on('guildMemberAdd', require('./events/guildMemberAdd'));
client.on('guildMemberRemove', require('./events/guildMemberRemove'));
client.on('messageCreate', require('./events/messageCreate'));
require("./events/message.js")
require("./events/ready.js")


const guildLogs = require("./guildLogs");
guildLogs(client);
/*=======================================================================================*/

/*=======================================================================================*/
let x = process.env.TOKEN;

/**
 * Token
 */
client.login(x).catch(e => {
  
  if (!x) {
    console.log("Lütfen bir token gir (process.env.TOKEN ayarlanmamış)");
    process.exit(0);
  }

  if (e.toString().includes("TOKEN_INVALID")) {
    console.log("Lütfen düzgün bir token gir");
    process.exit(0);
  }

  if (e.toString().includes("DISALLOWED_INTENTS")) {
    console.log("Lütfen botunun intentlerini aç. (Discord Developer Portal → Bot → Privileged Gateway Intents)");
    process.exit(0);
  }

  console.error(e);
  process.exit(0);

});


/*=======================================================================================*/

// ... Discord Client başlatma kodunuz ...
/////////////////////////////CAPS ENGELLL
const GuildSettings = require("./models/GuildSettings");

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const settings = await GuildSettings.findOne({ guildId: message.guild.id });
  if (!settings || !settings.capsLockEngel) return;

  const content = message.content;
  const letters = content.replace(/[^a-zA-ZĞÜŞİÖÇğüşiöç]/g, "");
  if (letters.length < 5) return; // kısa mesajları engelleme

  const upperCount = letters.split("").filter(ch => ch === ch.toUpperCase()).length;
  const ratio = upperCount / letters.length;

  if (ratio >= 0.7) { // %70+ büyük harf
    try {
      await message.delete();

      // Kullanıcıya uyarı embed
      const warnEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("<a:uyar1:1416526541030035530> CAPS-LOCK Tespit Edildi")
        .setDescription(`${message.author}, lütfen tüm mesajı büyük harflerle yazmayın.`);

      const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
      setTimeout(() => warnMsg.delete().catch(() => {}), 3000);

      // Log kanalına gönder
      const logKanalId = settings.capsLockLog;
      const logKanal = logKanalId ? message.guild.channels.cache.get(logKanalId) : null;

      if (logKanal && logKanal.permissionsFor(message.client.user).has("SendMessages")) {
        const logEmbed = new EmbedBuilder()
          .setColor("DarkBlue")
          .setTitle("🛑 CAPS-LOCK Logu")
          .addFields(
            { name: "Kullanıcı", value: `${message.author.tag} (${message.author.id})` },
            { name: "Kanal", value: `<#${message.channel.id}>`, inline: true },
            { name: "Mesaj İçeriği", value: `\`\`\`${message.content}\`\`\`` },
            { name: "Büyük Harf Oranı", value: `%${Math.round(ratio * 100)}`, inline: true },
            { name: "Zaman", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
          )
          .setFooter({ text: "Grave Caps-lock engel sistemi" });
        logKanal.send({ embeds: [logEmbed] });
      }
    } catch (err) {
      console.error("Caps-lock mesajı silinemedi veya log gönderilemedi:", err);
    }
  }
});
////////////////////////// CAPS ENGEL
client.on('interactionCreate', async interaction => {
    // Sadece buton etkileşimlerini dinle
    if (!interaction.isButton()) return;
    
    // Custom ID'si '2048_' ile başlayan butonlara odaklan
    if (interaction.customId.startsWith('2048_')) {
        
        // 1. Komut dosyasını (2048.js) client.commands koleksiyonundan bul
        const command = client.commands.get('2048'); // Komut adınız '2048' olduğu varsayılıyor
        
        // 2. Eğer komut mevcutsa ve handleMove fonksiyonuna sahipse çalıştır
        if (command && command.handleMove) {
            try {
                // handleMove fonksiyonunu çağırıyoruz
                await command.handleMove(interaction);
            } catch (error) {
                console.error('2048 Buton İşleme Hatası:', error);
                // KullanıcıyaEphemeral (gizli) hata mesajı gönderme
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({ content: 'Bu hareketi işlerken bir hata oluştu.', ephemeral: true });
                }
            }
        }
    }
});
//////// DEPREM SİSTEMİ 
client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'deprem_filter') {
        const command = client.commands.get('deprem');
        if (command && command.showFilterModal) {
            await command.showFilterModal(interaction);
        }
    }
});
////// deprem 2 
client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit() && interaction.customId === 'deprem_filter_modal') {
        const command = client.commands.get('deprem');
        if (command && command.handleModalSubmission) {
            await command.handleModalSubmission(interaction);
        }
    }
});
////
/*=======================================================================================*/
/**
 * ULTRA MEGA DM LOG VE YANIT SİSTEMİ
 */

const DM_LOG_KANAL_ID = "1452690319698034750"; // Buraya DM Loglarının düşeceği kanal ID'sini yaz
const BOT_SAHIP_ID = "702901632136118273";    // Senin ID'n

client.on('messageCreate', async (message) => {
    // Sadece DM'den gelen ve bot olmayan mesajları işle
    if (message.guild || message.author.bot) return;

    const logKanal = client.channels.cache.get(DM_LOG_KANAL_ID);
    if (!logKanal) return;

    const dmLogEmbed = new EmbedBuilder()
        .setColor('Blurple')
        .setAuthor({ name: `Yeni DM Mesajı!`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTitle(`👤 Gönderen: ${message.author.tag}`)
        .addFields(
            { name: '🆔 Kullanıcı ID', value: `\`${message.author.id}\``, inline: true },
            { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            { name: '💬 Mesaj İçeriği', value: message.content || "*Mesaj içeriği boş (Görsel veya dosya olabilir)*" }
        )
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Yanıtlamak için aşağıdaki butona tıkla.' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`dm_yanitla_${message.author.id}`)
            .setLabel('Yanıt Gönder')
            .setEmoji('📩')
            .setStyle(ButtonStyle.Success)
    );

    await logKanal.send({ embeds: [dmLogEmbed], components: [row] });
});

client.on('interactionCreate', async (interaction) => {
    // 1. BUTON TIKLAMA (MODAL AÇMA)
    if (interaction.isButton() && interaction.customId.startsWith('dm_yanitla_')) {
        if (interaction.user.id !== BOT_SAHIP_ID) {
            return interaction.reply({ content: '❌ Bu butonu sadece bot sahibi kullanabilir.', ephemeral: true });
        }

        const hedefId = interaction.customId.split('_')[2];

        const modal = new ModalBuilder()
            .setCustomId(`yanit_modal_${hedefId}`)
            .setTitle('Kullanıcıya Yanıt Gönder');

        const yanitInput = new TextInputBuilder()
            .setCustomId('yanit_mesaj_input')
            .setLabel("Mesajınız")
            .setPlaceholder("Kullanıcıya iletilecek yanıtı buraya yazın...")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(yanitInput));
        await interaction.showModal(modal);
    }

    // 2. MODAL GÖNDERME (DM İLETME)
    if (interaction.isModalSubmit() && interaction.customId.startsWith('yanit_modal_')) {
        const hedefId = interaction.customId.split('_')[2];
        const yanitMesaji = interaction.fields.getTextInputValue('yanit_mesaj_input');

        await interaction.deferReply({ ephemeral: true });

        try {
            const user = await client.users.fetch(hedefId);
            
            const replyEmbed = new EmbedBuilder()
                .setColor('Green')
                .setAuthor({ name: 'Grave Özel Mesaj Sistemleri', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(yanitMesaji)
                .setFooter({ text: 'Bu mesaj Grave tarafından iletilmiştir.' })
                .setTimestamp();

            await user.send({ embeds: [replyEmbed] });

            await interaction.editReply({ content: `✅ Yanıtınız **${user.tag}** kullanıcısına başarıyla iletildi.` });

            // Log kanalına bilgi düş
            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setAuthor({ name: `Yanıt İletildi`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(`**Alıcı:** <@${hedefId}>\n**Yanıtınız:** ${yanitMesaji}`)
                .setTimestamp();
            
            await interaction.channel.send({ embeds: [successEmbed] });

        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: `❌ Kullanıcıya mesaj gönderilemedi (DM kapalı olabilir).` });
        }
    }
});
/*=======================================================================================*/
