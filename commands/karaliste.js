const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const Blacklist = require('../models/karaliste'); // Şemayı doğru yolu ile çağırın

// Bot sahibinin ID'sini buraya ekleyin (ZORUNLU)
const OWNER_ID = "702901632136118273"; 

module.exports.run = async (client, message, args) => {
    // 1. YETKİLENDİRME KONTROLÜ
    if (message.author.id !== OWNER_ID) {
        return message.reply({ embeds: [
            new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('❌ Bu komutu yalnızca botun geliştiricisi kullanabilir.')
        ]});
    }

    const targetId = args[0];
    const reason = args.slice(1).join(' ') || 'Belirtilmemiş sebep.';

    if (!targetId) {
        return message.reply('Lütfen kara listeye almak/kaldırmak istediğiniz sunucunun ID\'sini belirtin.');
    }

    // Kara listeye alınacak sunucuyu bul
    const targetGuild = client.guilds.cache.get(targetId);
    let guildName = 'Bilinmeyen Sunucu';
    if (targetGuild) {
        guildName = targetGuild.name;
    } else if (targetId === message.guild.id) {
         guildName = message.guild.name;
    }

    // 2. SUNUCU DURUMU KONTROLÜ
    const isBlacklisted = await Blacklist.findOne({ guildID: targetId });

    if (isBlacklisted) {
        // --- SUNUCU ZATEN KARA LİSTEDE: KALDIRMA İŞLEMİ ---
        const removeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('unblacklist_confirm').setLabel('Evet, Kara Listeden Kaldır').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('unblacklist_cancel').setLabel('İptal').setStyle(ButtonStyle.Danger)
        );

        const removeEmbed = new EmbedBuilder()
            .setColor('DarkRed')
            .setTitle('🚨 Kara Listeden Kaldırma Onayı')
            .setDescription(`**${guildName}** (ID: \`${targetId}\`) zaten kara listede.\n\n`
                + `**Sebep:** ${isBlacklisted.reason}\n`
                + `**Kaldırmak** istediğinizden emin misiniz?`);

        const msg = await message.channel.send({ embeds: [removeEmbed], components: [removeRow] });
        
        // COLLECTOR (Kaldırma İşlemi)
        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000, 
            max: 1 
        });

        collector.on('collect', async i => {
            if (i.customId === 'unblacklist_confirm') {
                await Blacklist.deleteOne({ guildID: targetId });

                const successEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('✅ Başarılı')
                    .setDescription(`Sunucu **${guildName}** kara listeden **başarıyla kaldırıldı**.`);
                
                await i.update({ embeds: [successEmbed], components: [] });
            } else {
                await i.update({ embeds: [new EmbedBuilder().setColor('Grey').setDescription('İşlem iptal edildi.')], components: [] });
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                 await msg.edit({ embeds: [new EmbedBuilder().setColor('Grey').setDescription('Zaman aşımı. İşlem iptal edildi.')], components: [] }).catch(() => {});
            }
        });

    } else {
        // --- SUNUCU KARA LİSTEDE DEĞİL: EKLEME İŞLEMİ ---
        
        // Kendi sunucusunu kara listeye alma kontrolü
        if (targetId === message.guild.id && targetId !== OWNER_ID) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FFA500').setDescription('⚠️ Kendi bulunduğunuz sunucuyu kara listeye alamazsınız.')] });
        }
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('blacklist_confirm').setLabel('Evet, Kara Listeye Ekle').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('blacklist_cancel').setLabel('İptal').setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('⚠️ Kara Listeye Alma Onayı')
            .setDescription(`**${guildName}** (ID: \`${targetId}\`) sunucusunu kara listeye **eklemek** üzeresiniz.\n\n`
                + `**Bot bu sunucuda bir daha çalışmayacaktır.**\n`
                + `**Sebep:** ${reason}\n\n`
                + `Emin misiniz?`);

        const msg = await message.channel.send({ embeds: [embed], components: [row] });
        
        // COLLECTOR (Ekleme İşlemi)
        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000, 
            max: 1 
        });

        collector.on('collect', async i => {
            if (i.customId === 'blacklist_confirm') {
                const newBlacklist = new Blacklist({
                    guildID: targetId,
                    reason: reason,
                    operator: message.author.tag
                });
                await newBlacklist.save();

                const successEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('⛔ Başarıyla Kara Listeye Eklendi')
                    .setDescription(`Sunucu **${guildName}** kara listeye **başarıyla eklendi**.\nBot artık bu sunucuda çalışmayacaktır.`);
                
                await i.update({ embeds: [successEmbed], components: [] });

                // Ek: Sunucudan ayrılma (İsteğe Bağlı)
                if (targetGuild && targetGuild.id !== message.guild.id) {
                    await targetGuild.leave().catch(err => {
                        console.error(`Sunucudan ayrılırken hata oluştu: ${err}`);
                    });
                }

            } else {
                await i.update({ embeds: [new EmbedBuilder().setColor('Grey').setDescription('İşlem iptal edildi.')], components: [] });
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                 await msg.edit({ embeds: [new EmbedBuilder().setColor('Grey').setDescription('Zaman aşımı. İşlem iptal edildi.')], components: [] }).catch(() => {});
            }
        });
    }
};

module.exports.conf = {
    aliases: ['blacklist', 'bl'],
    permLevel: 4 // Yüksek izin seviyesi
};

module.exports.help = {
    name: 'karaliste',
    description: 'Bir sunucuyu kara listeye alır veya listeden kaldırır.',
    usage: 'g!karaliste <Sunucu ID> [Sebep]'
};
