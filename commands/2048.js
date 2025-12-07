const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs'); // Dosyayı kaydetmek için

// Botun belleğinde aktif oyunları tutmak için basit bir Map
// Key: Mesaj ID'si, Value: { board, score, userId }
const activeGames = new Map();

// --- Görselleştirme Fonksiyonu (Canvas) ---

async function drawBoard(board, score) {
    const SIZE = 4;
    const TILE_SIZE = 100;
    const PADDING = 10;
    const WIDTH = SIZE * TILE_SIZE + (SIZE + 1) * PADDING;
    const HEIGHT = WIDTH;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // Arkaplan
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Kiremit Renkleri (Basit bir palet)
    const colors = {
        0: { bg: '#cdc1b4', text: '#776e65' },
        2: { bg: '#eee4da', text: '#776e65' },
        4: { bg: '#ede0c8', text: '#776e65' },
        8: { bg: '#f2b179', text: '#f9f6f2' },
        16: { bg: '#f59563', text: '#f9f6f2' },
        32: { bg: '#f67c5f', text: '#f9f6f2' },
        64: { bg: '#f65e3b', text: '#f9f6f2' },
        128: { bg: '#edcf72', text: '#f9f6f2' },
        256: { bg: '#edcc61', text: '#f9f6f2' },
        512: { bg: '#edc850', text: '#f9f6f2' },
        1024: { bg: '#edc53f', text: '#f9f6f2' },
        2048: { bg: '#edc22e', text: '#f9f6f2' },
    };

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const value = board[r][c];
            const x = c * TILE_SIZE + (c + 1) * PADDING;
            const y = r * TILE_SIZE + (r + 1) * PADDING;
            const tileColor = colors[value] || colors[2048]; // Büyük sayılar için 2048 rengini kullan

            // Kiremit Arkaplanı
            ctx.fillStyle = tileColor.bg;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Kiremit Değeri
            if (value !== 0) {
                ctx.fillStyle = tileColor.text;
                let fontSize;
                if (value >= 1024) {
                    fontSize = 35; // Daha küçük font
                } else if (value >= 128) {
                    fontSize = 40;
                } else {
                    fontSize = 50;
                }
                
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(value), x + TILE_SIZE / 2, y + TILE_SIZE / 2);
            }
        }
    }

    // Canvas'ı bir buffer olarak döndür
    return canvas.toBuffer('image/png');
}

// --- Oyun Mantığı Fonksiyonları (Önceki cevaptaki aynı mantık) ---
// (Bu kısım uzun olduğu için buraya eklemiyorum, önceki cevabınızdaki tüm move, transpose, initializeBoard ve isGameOver fonksiyonlarını buraya kopyalamanız gerekir.)

// Kopyalanması gereken temel fonksiyonlar: initializeBoard, addRandomTile, transpose, move, isGameOver

// ... BURAYA OYUN MANTIĞI FONKSİYONLARINI EKLEYİN ...

const SIZE = 4; // Tekrar tanımlamadan kaçının

function initializeBoard() {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  addRandomTile(board);
  addRandomTile(board);
  return board;
}

function addRandomTile(board) {
  let emptyCells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        emptyCells.push({ r, c });
      }
    }
  }

  if (emptyCells.length > 0) {
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }
  return false;
}

function transpose(board) {
  return board[0].map((_, colIndex) => board.map(row => row[colIndex]));
}

function move(board, score, direction) {
  let newBoard = board.map(arr => [...arr]);
  let currentScore = score;
  let hasChanged = false;

  if (direction === 'UP' || direction === 'DOWN') {
    newBoard = transpose(newBoard);
  }

  for (let r = 0; r < SIZE; r++) {
    let row = [...newBoard[r]];
    
    if (direction === 'RIGHT' || direction === 'DOWN') {
      row.reverse();
    }
    
    let newRow = row.filter(val => val !== 0);
    
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] !== 0 && newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        currentScore += newRow[i];
        newRow[i + 1] = 0;
      }
    }
    
    newRow = newRow.filter(val => val !== 0);
    
    while (newRow.length < SIZE) {
      if (direction === 'LEFT' || direction === 'UP') {
        newRow.push(0);
      } else {
        newRow.unshift(0);
      }
    }
    
    if (JSON.stringify(newRow) !== JSON.stringify(row)) {
        hasChanged = true;
    }

    newBoard[r] = newRow;
  }
  
  if (direction === 'UP' || direction === 'DOWN') {
    newBoard = transpose(newBoard);
  }
  
  return { board: newBoard, score: currentScore, hasChanged };
}

function isGameOver(board) {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] === 2048) return { over: false, won: true };
        }
    }
    
    if (board.some(row => row.includes(0))) return { over: false, won: false };

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const current = board[r][c];
            if (c < SIZE - 1 && current === board[r][c + 1]) return { over: false, won: false };
            if (r < SIZE - 1 && current === board[r + 1][c]) return { over: false, won: false };
        }
    }
    
    return { over: true, won: false };
}

// --- Mesaj Güncelleme Fonksiyonu ---

async function updateGameMessage(interaction, board, score) {
    const { over, won } = isGameOver(board);
    
    // Canvas ile görseli oluştur
    const imageBuffer = await drawBoard(board, score);
    
    // Discord dosyası oluştur
    const file = { attachment: imageBuffer, name: '2048_game.png' };

    let title = '🔢 Görsel 2048 Oyunu';
    let color = 'Purple';
    let footerText = 'Butonlara tıklayarak hareket edin.';
    
    if (won) {
        title = '🎉 Tebrikler! Kazandınız! (2048)';
        color = 'Gold';
        footerText = 'Oyun bitti! Skorunuz: ' + score;
    } else if (over) {
        title = '❌ Oyun Bitti';
        color = 'Red';
        footerText = 'Hareket kalmadı. Skorunuz: ' + score;
    }

    const gameEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(`**Sıra:** <@${interaction.user.id}>`)
        .addFields(
            { name: 'Skor', value: `**${score}**`, inline: true }
        )
        .setImage('attachment://2048_game.png') // Resim dosyasını embed içine ekle
        .setFooter({ text: footerText });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('2048_UP')
                .setLabel('⬆️ Yukarı')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(over),
            new ButtonBuilder()
                .setCustomId('2048_DOWN')
                .setLabel('⬇️ Aşağı')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(over),
            new ButtonBuilder()
                .setCustomId('2048_LEFT')
                .setLabel('⬅️ Sol')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(over),
            new ButtonBuilder()
                .setCustomId('2048_RIGHT')
                .setLabel('➡️ Sağ')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(over),
            new ButtonBuilder()
                .setCustomId('2048_STOP')
                .setLabel('🛑 Bitir')
                .setStyle(ButtonStyle.Danger)
        );

    // Mesajı güncelle, dosyayı (görseli) ekle
    await interaction.editReply({ embeds: [gameEmbed], components: [row], files: [file] });
    return { over, won };
}

// --- Komut Çalıştırıcı ---

module.exports.run = async (client, message, args) => {
    
    // 1. Yeni oyun başlatma
    if (args[0] === 'başlat' || args[0] === 'start') {
        const loadingEmbed = new EmbedBuilder()
          .setColor('Yellow')
          .setDescription('⏳ Görsel tahta hazırlanıyor...');

        // Mesajı gönder
        const msg = await message.channel.send({ embeds: [loadingEmbed] });

        const board = initializeBoard();
        const score = 0;
        
        // Oyunu aktif oyunlar listesine ekle
        activeGames.set(msg.id, { 
            board: board, 
            score: score, 
            userId: message.author.id 
        });

        // Mesajı güncellemek için etkileşim objesi oluştur
        const interaction = {
            editReply: (options) => msg.edit(options),
            user: message.author,
            id: msg.id 
        };
        await updateGameMessage(interaction, board, score);
        return;
    }
    
    // 2. Yardım mesajı
    const helpEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('2048 Bot Komutu')
        .setDescription('Discord üzerinde **Görsel** 2048 oynamak için:\n\n**!2048 başlat**');

    await message.channel.send({ embeds: [helpEmbed] });
};

// --- Buton Etkileşimini İşleyen Fonksiyon ---
// (Bu fonksiyon botunuzun interactionCreate olayından çağrılmalıdır.)
module.exports.handleMove = async (interaction) => {
    
    // Oyun durumunu al
    const game = activeGames.get(interaction.message.id);
    
    if (!game) {
        return interaction.reply({ content: 'Bu oyunun durumu bulunamadı.', ephemeral: true });
    }
    // Sadece oyunu başlatan kişi hareket edebilsin
    if (interaction.user.id !== game.userId) {
        return interaction.reply({ content: 'Sadece bu oyunu başlatan kişi hareket edebilir.', ephemeral: true });
    }
    
    await interaction.deferUpdate(); // Cevabı geciktir

    const direction = interaction.customId.replace('2048_', '');

    if (direction === 'STOP') {
        activeGames.delete(interaction.message.id);
        const stopEmbed = new EmbedBuilder()
            .setColor('DarkOrange')
            .setTitle('Oyun Durduruldu')
            .setDescription(`Oyun başarıyla durduruldu. Skorun: **${game.score}**`);
        
        return interaction.editReply({ embeds: [stopEmbed], components: [], files: [] });
    }

    let { board, score } = game;
    const { board: newBoard, score: newScore, hasChanged } = move(board, score, direction);

    if (hasChanged) {
        addRandomTile(newBoard);
        
        // Oyun durumunu güncelle
        game.board = newBoard;
        game.score = newScore;
        activeGames.set(interaction.message.id, game);

        const { over } = await updateGameMessage(interaction, newBoard, newScore);
        
        if (over) {
            activeGames.delete(interaction.message.id);
        }
    } else {
        // Hareket mümkün değilse geri bildirim ver
        await interaction.followUp({ content: 'Bu yönde hareket etmek mümkün değil.', ephemeral: true });
    }
};


module.exports.conf = {
  aliases: ['g2048', 'visual2048']
};

module.exports.help = {
  name: '2048'
};
