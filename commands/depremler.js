const axios = require('axios');
const cheerio = require('cheerio');
const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle // Modal için gerekli kütüphaneler eklendi
} = require('discord.js');

// Veri kaynağı
const DATA_URL = 'http://www.koeri.boun.edu.tr/scripts/lst0.asp';
const perPage = 10;

// ****************************
// ⚠️ DİKKAT: MODAL VE FİLTRELEME İÇİN ÖNEMLİ YAPILAR
// ****************************

// Global Cache: Verileri sürekli çekmemek için
let cachedDepremler = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 60 saniye cache süresi

// Deprem Sınıfı ve Yardımcı Fonksiyonlar (Mevcut kodunuzdan aynen alınmıştır)

function getMagnitudeStyle(magnitude) {
    const mag = parseFloat(magnitude);
    if (isNaN(mag)) return { color: '#808080', emoji: '⚪', title: 'Son Depremler' };

    if (mag >= 5.0) return { color: '#e74c3c', emoji: '🔴', title: '⚠️ BÜYÜK DEPREM UYARISI' };
    if (mag >= 4.0) return { color: '#f39c12', emoji: '🟠', title: 'Önemli Depremler' };
    if (mag >= 3.0) return { color: '#f1c40f', emoji: '🟡', title: 'Son Depremler' };
    if (mag >= 1.0) return { color: '#2ecc71', emoji: '🟢', title: 'Son Depremler' };
    return { color: '#3498db', emoji: '🔵', title: 'Son Depremler' };
}

class Deprem {
    constructor(tarih, saat, enlem, boylam, derinlik, buyukluk, yer, sehir) {
        this.tarih = tarih; this.saat = saat; this.enlem = enlem; 
        this.boylam = boylam; this.derinlik = derinlik; this.buyukluk = buyukluk; 
        this.yer = yer; this.sehir = sehir;
    }
}

async function fetchAndCacheDepremler() {
    if (Date.now() - lastFetchTime < CACHE_DURATION && cachedDepremler.length > 0) {
        const mainStyle = cachedDepremler.length > 0 ? getMagnitudeStyle(cachedDepremler[0].buyukluk) : getMagnitudeStyle(0);
        return { depremler: cachedDepremler, mainStyle, fromCache: true };
    }
    
    try {
        const response = await axios.get(DATA_URL, { timeout: 15000 });
        const $ = cheerio.load(response.data);
        const text = $('pre').text();
        let result = text.split('\n').splice(6);

        const depremler = [];
        result.forEach(element => {
            const depremString = element.trim().split(/\s+/).filter(e => e.length > 0);
            if (depremString.length < 10) return;
            const [tarih, saat, enlem, boylam, derinlik, , buyukluk, , yer, sehir] = depremString;
            depremler.push(new Deprem(tarih, saat, enlem, boylam, derinlik, buyukluk, yer, sehir));
        });

        cachedDepremler = depremler;
        lastFetchTime = Date.now();
        const mainStyle = depremler.length > 0 ? getMagnitudeStyle(depremler[0].buyukluk) : getMagnitudeStyle(0);
        return { depremler, mainStyle, fromCache: false };
        
    } catch (error) {
        console.error('Veri çekme hatası:', error.message);
        return { depremler: [], mainStyle: getMagnitudeStyle(0), fromCache: false };
    }
}

// Yeni Embed Oluşturucu (Filtre metnini göstermek için güncellendi)
const generateEmbed = (depremler, page, maxPages, mainStyle, filterText = null) => {
    const slice = depremler.slice(page * perPage, (page + 1) * perPage);

    let titleText = `${mainStyle.emoji} ${mainStyle.title}`;
    if (filterText) {
        titleText += ` (Filtre: "${filterText}")`;
    } else {
        titleText += ` (Sayfa ${page + 1}/${maxPages})`;
    }

    return new EmbedBuilder()
        .setColor(mainStyle.color)
        .setTitle(titleText)
        .setTimestamp()
        .setFooter({ 
            text: `Motion Deprem Verisi • Toplam: ${depremler.length} kayıt • Son güncelleme: ${new Date().toLocaleTimeString('tr-TR')}` 
        })
        .setDescription(
            depremler.length > 0 ? slice.map(d => {
                const { emoji } = getMagnitudeStyle(d.buyukluk);
                const yerAdi = d.yer.trim() + (d.sehir.trim() !== '' ? ` (${d.sehir.trim()})` : '');
                const mapLink = `https://www.google.com/maps/search/?api=1&query=$${d.enlem},${d.boylam}`; // Düzeltilmiş Harita Linki
                
                return `${emoji} **${d.buyukluk}** | **Derinlik:** ${d.derinlik} km\n` +
                       `🕒 **${d.tarih}** ${d.saat} | 📍 [${yerAdi}](${mapLink})`;
            }).join('\n\n') : 'Bu filtreye uygun deprem kaydı bulunamadı.'
        );
};

// Yeni Satır Oluşturucu (Filtre Butonu Eklendi)
const generateRow = (page, maxPages) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('deprem_prev')
            .setLabel('⬅️ Geri')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId('deprem_filter') // 🔍 MODAL AÇAN BUTON EKLENDİ
            .setLabel('🔍 Şehir/Bölge Ara')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('deprem_refresh')
            .setLabel('🔄 Yenile')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('deprem_next')
            .setLabel('İleri ➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page + 1 >= maxPages)
    );
};

// MODAL YAPISI
function createFilterModal() {
    const modal = new ModalBuilder()
        .setCustomId('deprem_filter_modal')
        .setTitle('Şehir veya Bölge Filtreleme');

    const filterInput = new TextInputBuilder()
        .setCustomId('filter_input')
        .setLabel('Şehir, İlçe veya Bölge Adı (Örn: İstanbul, EGE)')
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(filterInput));
    return modal;
}

// ****************************
// 🛠️ module.exports.run: KOMUTUN BAŞLATILMASI (Mevcut Collector Mantığı)
// ****************************

module.exports.run = async (client, message, args) => {
    
    // Yükleniyor Mesajı
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('<a:yukle:1440677432976867448> MotionAPI verileri çekiliyor...');
    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    let { depremler, mainStyle, fromCache } = await fetchAndCacheDepremler();
    
    if (depremler.length === 0) {
        return msg.edit({ 
            embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Deprem Verisi Bulunamadı').setDescription('Veri kaynağına bağlanılamadı veya veri boş döndü.')] 
        }).catch(() => {});
    }

    // İlk gönderim için değerler
    let currentDepremler = depremler; // Bu liste filtreleme/sayfalama için kullanılacak
    let currentPage = 0;
    let maxPages = Math.ceil(currentDepremler.length / perPage);
    let currentFilter = null; // Filtre metni

    // İlk gönderim
    await msg.edit({ 
        embeds: [generateEmbed(currentDepremler, currentPage, maxPages, mainStyle, currentFilter)], 
        components: [generateRow(currentPage, maxPages)],
        content: fromCache ? '✅ Veriler cache`ten yüklendi. (60s)' : null
    });

    const collector = msg.createMessageComponentCollector({ time: 300_000 }); // 5 dakika

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
            return interaction.reply({ content: 'Bu butonları sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
        }
        
        // Modal açma butonu, collector içinde değil, harici dinleyici tarafından ele alınacak.
        if (interaction.customId === 'deprem_filter') {
            // Kullanıcıya harici dinleyiciye yönlendirmesi için bilgilendirme yapalım.
            // Bu collector bu butonu işleyemediği için defer/reply yapmadan sonlandırıyoruz.
            // Bu mesajın harici olarak işlenmesi gerekiyor (Aşağıdaki talimata bakın).
            return; 
        }

        await interaction.deferUpdate().catch(() => {});
        
        let isRefreshed = false;
        
        if (interaction.customId === 'deprem_prev') {
            currentPage = currentPage > 0 ? currentPage - 1 : 0;
        } else if (interaction.customId === 'deprem_next') {
            if (currentPage + 1 < maxPages) currentPage++;
        } else if (interaction.customId === 'deprem_refresh') {
            // Yenile → verileri tekrar çek
            const freshData = await fetchAndCacheDepremler();
            depremler = freshData.depremler; 
            mainStyle = freshData.mainStyle;
            currentDepremler = depremler; // Filtrelenmiş listeyi sıfırla
            currentFilter = null; // Filtreyi sıfırla
            currentPage = 0;
            isRefreshed = true;
            if (depremler.length === 0) {
                 return interaction.editReply({ 
                    embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ Deprem Verisi Bulunamadı').setDescription('Veri kaynağına bağlanılamadı.')],
                    components: [] 
                });
            }
        }
        
        maxPages = Math.ceil(currentDepremler.length / perPage);
        currentPage = currentPage >= maxPages ? 0 : currentPage;
        
        await interaction.editReply({ 
            embeds: [generateEmbed(currentDepremler, currentPage, maxPages, mainStyle, currentFilter)], 
            components: [generateRow(currentPage, maxPages)]
        });
    });

    collector.on('end', async () => {
        const endEmbed = new EmbedBuilder(msg.embeds[0]).setFooter({ text: 'Süre dolduğu için butonlar kaldırıldı. Komutu yeniden kullanabilirsiniz.' });
        await msg.edit({ embeds: [endEmbed], components: [] }).catch(() => {});
    });
};

// ****************************
// 📢 HARİCİ İŞLEYİCİ FONKSİYONLAR (Ana dosyada çağrılacak!)
// ****************************

// 1. Modal'ı gösteren fonksiyon (🔍 Şehir/Bölge Ara butonuna basınca çağrılır)
module.exports.showFilterModal = async (interaction) => {
    await interaction.showModal(createFilterModal());
};

// 2. Modal yanıtını işleyen fonksiyon (Filtre formunu gönderince çağrılır)
module.exports.handleModalSubmission = async (interaction) => {
    await interaction.deferReply({ ephemeral: true }); // Yanıtı ertele (kullanıcıya gizli)

    const filterText = interaction.fields.getTextInputValue('filter_input').toUpperCase();
    
    // Cache'lenmiş veriyi kullan
    const { depremler, mainStyle } = await fetchAndCacheDepremler();
    
    if (depremler.length === 0) {
        return interaction.editReply({ content: 'Deprem verisi çekilemedi.', ephemeral: true });
    }

    // Filtreleme yap
    const filteredDepremler = depremler.filter(d => 
        d.yer.toUpperCase().includes(filterText) || d.sehir.toUpperCase().includes(filterText)
    );
    
    const maxPages = Math.ceil(filteredDepremler.length / perPage);
    const currentPage = 0;
    
    // Yeni bir mesaj olarak filtreli sonucu gönder
    const resultEmbed = generateEmbed(filteredDepremler, currentPage, maxPages, mainStyle, filterText);
    const resultRow = generateRow(currentPage, maxPages);

    const newMsg = await interaction.channel.send({ 
        embeds: [resultEmbed], 
        components: [resultRow] 
    });
    
    await interaction.editReply({ content: `✅ "${filterText}" filtresine uygun ${filteredDepremler.length} kayıt yeni bir mesaj olarak gönderildi!`, ephemeral: true });

    // ÖNEMLİ: BU YENİ MESAJ İÇİN DE BİR COLLECTOR BAŞLATILMALI!
    // Yeni mesajın sayfalamasının çalışması için bu kısım kritik.
    startCollectorForFilteredMessage(newMsg, filteredDepremler, mainStyle, filterText, interaction.user.id);
};


// 3. Filtreli Mesaj İçin Yeni Collector Başlatıcı
function startCollectorForFilteredMessage(msg, filteredDepremler, mainStyle, filterText, userId) {
    let currentDepremler = filteredDepremler;
    let currentPage = 0;
    let maxPages = Math.ceil(currentDepremler.length / perPage);
    
    const collector = msg.createMessageComponentCollector({ time: 300_000 }); // 5 dakika

    collector.on('collect', async (i) => {
        if (i.user.id !== userId) {
            return i.reply({ content: 'Bu butonları sadece filtrelemeyi yapan kişi kullanabilir.', ephemeral: true });
        }
        
        // Bu collector sadece sayfalama ve yenilemeyi işler.
        if (i.customId === 'deprem_filter') {
            return; // Filtre butonu ana dosyadaki dinleyici tarafından işlenmeye devam edecek.
        }

        await i.deferUpdate().catch(() => {});
        
        let isRefreshed = false;
        
        if (i.customId === 'deprem_prev') {
            currentPage = currentPage > 0 ? currentPage - 1 : 0;
        } else if (i.customId === 'deprem_next') {
            if (currentPage + 1 < maxPages) currentPage++;
        } else if (i.customId === 'deprem_refresh') {
            // Yenileme yapıldığında, filtreyi koruyarak ana veriyi tekrar çek
            const freshData = await fetchAndCacheDepremler();
            const freshDepremler = freshData.depremler;
            mainStyle = freshData.mainStyle;
            
            // Filtrelemeyi tekrar uygula
            currentDepremler = freshDepremler.filter(d => 
                d.yer.toUpperCase().includes(filterText) || d.sehir.toUpperCase().includes(filterText)
            );
            currentPage = 0;
            isRefreshed = true;
            if (currentDepremler.length === 0) {
                 await i.editReply({ embeds: [new EmbedBuilder().setColor('Red').setTitle(`❌ Filtreli Veri Bulunamadı (Filtre: ${filterText})`).setDescription('Yenileme sonrasında bu filtreye uygun yeni kayıt yok.')], components: [] });
                 return collector.stop('no_data_after_refresh');
            }
        }
        
        maxPages = Math.ceil(currentDepremler.length / perPage);
        currentPage = currentPage >= maxPages ? 0 : currentPage;
        
        await i.editReply({ 
            embeds: [generateEmbed(currentDepremler, currentPage, maxPages, mainStyle, filterText)], 
            components: [generateRow(currentPage, maxPages)]
        });
    });

    collector.on('end', async () => {
        const endEmbed = new EmbedBuilder(msg.embeds[0]).setFooter({ text: 'Süre dolduğu için butonlar kaldırıldı.' });
        await msg.edit({ embeds: [endEmbed], components: [] }).catch(() => {});
    });
}


module.exports.conf = {
    aliases: ['deprem-son', 'earthquake'],
    modalId: 'deprem_filter_modal' // Dış dinleyici için Modal ID'si
};

module.exports.help = {
    name: 'deprem',
    description: 'Son depremleri Kandilli Rasathanesi verileriyle sayfalı ve Modal ile şehir/bölge filtresi uygulayarak gösterir.'
};
