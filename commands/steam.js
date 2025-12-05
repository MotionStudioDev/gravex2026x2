const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

// Steam Store'da arama yapmak için kullanılan API
const SEARCH_API_URL = 'https://store.steampowered.com/api/storesearch/';
const DETAIL_API_URL = 'https://store.steampowered.com/api/appdetails/';

// Yardımcı fonksiyon: HTML etiketlerini temizler
function cleanHTML(text) {
    if (!text) return 'Veri yok.';
    return text.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"');
}

module.exports.run = async (client, message, args) => {
    const query = args.join(' ');
    
    if (!query) {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('🚫 Hatalı Kullanım')
                    .setDescription('Lütfen aramak istediğiniz oyunun adını belirtin.')
                    .setFooter({ text: 'Örnek: g!steam Elden Ring' })
            ]
        });
    }

    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription(`🔍 **"${query}"** için Steam mağazasında arama yapılıyor...`);
    
    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    try {
        // 1. OYUN ID'SİNİ BULMA (STORE SEARCH)
        const searchResponse = await axios.get(SEARCH_API_URL, {
            params: { cc: 'tr', l: 'turkish', term: query }
        });

        if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
            return msg.edit({
                embeds: [new EmbedBuilder().setColor('Red').setTitle('🔍 Oyun Bulunamadı').setDescription(`**"${query}"** adına sahip bir oyun bulunamadı.`)]
            });
        }

        const appID = searchResponse.data.items[0].id; 
        
        // 2. OYUN DETAYLARINI ÇEKME
        const detailResponse = await axios.get(DETAIL_API_URL, {
            params: { appids: appID, cc: 'tr', l: 'turkish', currency: 'TRY' }
        });

        const appData = detailResponse.data[appID].data;

        if (!appData) {
            return msg.edit({
                embeds: [new EmbedBuilder().setColor('Red').setTitle('⚠️ Detay Hatası').setDescription(`**${searchResponse.data.items[0].name}** oyununun detayları çekilemedi.`)]
            });
        }
        
        // --- VERİ AYIKLAMA ---
        const priceData = appData.price_overview;
        let priceString;
        let color = '#2a475e'; 
        let imageUrl = appData.header_image; 
        
        // İndirim ve Fiyat Yönetimi
        if (priceData) {
            const finalPrice = priceData.final_formatted;
            const initialPrice = priceData.initial_formatted;
            const discountPercent = priceData.discount_percent;

            if (discountPercent > 0) {
                priceString = `~~${initialPrice}~~ **${finalPrice}** (${discountPercent}% İndirim!)`;
                color = '#70c045'; // Yeşil
            } else if (finalPrice) {
                priceString = `**${finalPrice}**`;
            } else {
                priceString = appData.is_free ? '**Ücretsiz Oynanabilir**' : '**Fiyat Bilgisi Yok / Yakında Çıkıyor**';
                color = '#5dade2';
            }
        } else {
             priceString = appData.is_free ? '**Ücretsiz Oynanabilir**' : '**Fiyat Bilgisi Yok / Mağazada Mevcut Değil**';
        }
        
        // Ekran Görüntüsü (Screenshot)
        let mainImage = imageUrl;
        if (appData.screenshots && appData.screenshots.length > 0) {
            // İlk ekran görüntüsünün tam boyutlu URL'sini al
            mainImage = appData.screenshots[0].path_full;
        }

        const description = cleanHTML(appData.short_description);
        const genres = appData.genres ? appData.genres.map(g => g.description).join(', ') : 'Belirtilmemiş';
        const developers = appData.developers ? appData.developers.join(', ') : 'Bilinmiyor';
        const publishers = appData.publishers ? appData.publishers.join(', ') : 'Bilinmiyor';

        // --- EMBED OLUŞTURMA ---
        const steamEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`🎮 ${appData.name}`)
            .setURL(`https://store.steampowered.com/app/${appID}`)
            .setDescription(description.length > 300 ? description.substring(0, 300) + '...' : description)
            .setImage(mainImage) // Ana görsel olarak ekran görüntüsü
            .setThumbnail(appData.header_image) // Sol üst köşeye başlık görseli
            .addFields(
                { name: '💰 Güncel Fiyat', value: priceString, inline: false },
                { name: '📢 Yayıncı', value: publishers.substring(0, 50), inline: true },
                { name: '💻 Geliştirici', value: developers.substring(0, 50), inline: true },
                { name: '📅 Çıkış Tarihi', value: appData.release_date ? appData.release_date.date : 'Bilinmiyor', inline: true },
                { name: '🏷️ Türler', value: genres.length > 50 ? genres.substring(0, 50) + '...' : genres, inline: true }
            )
            .setFooter({ text: `Steam App ID: ${appID} | Powered by Steam` });

        // --- BUTON OLUŞTURMA ---
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Steam Mağazasında Gör')
                .setURL(`https://store.steampowered.com/app/${appID}`)
                .setStyle(ButtonStyle.Link)
                .setEmoji('🔗'),
            new ButtonBuilder()
                .setLabel('Fiyat Geçmişi (SteamDB)') // Alternatif bilgi kaynağı
                .setURL(`https://steamdb.info/app/${appID}/`) 
                .setStyle(ButtonStyle.Link)
                .setEmoji('📊')
        );

        await msg.edit({ embeds: [steamEmbed], components: [row] });

    } catch (error) {
        console.error('Steam Komut Hatası:', error);
        let errorMessage = 'Bilinmeyen bir hata oluştu. Lütfen botun konsolunu kontrol edin.';
        
        // Axios'tan gelen özel hataları yakalama
        if (error.response && error.response.status === 404) {
            errorMessage = 'Aradığınız oyun bulunamadı veya Steam API geçici olarak kapalı.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Steam API yanıt vermekte gecikti (Timeout). Lütfen tekrar deneyin.';
        }

        msg.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('❌ API Bağlantı Hatası')
                    .setDescription(errorMessage)
            ]
        }).catch(() => {});
    }
};

module.exports.conf = {
    aliases: ['steamoyun', 'oyunfiyat', 'appinfo']
};

module.exports.help = {
    name: 'steam',
    description: 'Belirtilen oyunun Steam mağazasındaki güncel fiyat, indirim, detay ve görsellerini gösterir.'
};
