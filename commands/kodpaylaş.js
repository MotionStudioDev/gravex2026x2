const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports.run = async (client, message, args) => {
  try {
    // Parametreleri kontrol et
    if (!args[0] || !args[1]) {
      const helpEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('❌ Eksik Parametre')
        .setDescription(
          '### Kullanım:\n' +
          `g!kodpaylaş <kod_türü> <link>\`\n\n` +
          '**Örnekler:**\n' +
          `g!kodpaylaş javascript github.com\`\n` +
          `g!kodpaylaş python mostebin.vercel.app\`\n\n` +
          '**Desteklenen Diller:**\n' +
          'javascript, python, java, cpp, csharp, php, ruby, go, rust, typescript, htmlcss, diğer'
        );
      return message.channel.send({ embeds: [helpEmbed] });
    }

    const [codeType, link] = args;

    // Dil doğrulaması ve kısaltma desteği
    const typeAliases = {
      'js': 'javascript',
      'py': 'python', 
      'java': 'java',
      'cpp': 'cpp',
      'c++': 'cpp',
      'c#': 'csharp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'ts': 'typescript',
      'html': 'htmlcss',
      'css': 'htmlcss',
      'diğer': 'diğer',
      'diger': 'diğer'
    };
    
    const validTypes = ['javascript', 'python', 'java', 'cpp', 'csharp', 'php', 'ruby', 'go', 'rust', 'typescript', 'htmlcss', 'diğer'];
    
    // Kısaltmayı tam dil adına çevir
    const normalizedType = typeAliases[codeType.toLowerCase()] || codeType.toLowerCase();
    
    if (!validTypes.includes(normalizedType)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setDescription(`❌ Geçersiz kod türü: \`${codeType}\`\nDesteklenen diller: ${Object.keys(typeAliases).join(', ')}`);
      return message.channel.send({ embeds: [errorEmbed] });
    }

    // URL doğrulama
    let validUrl = link.trim();
    
    // Sadece https:// ekleme
    if (!validUrl.startsWith('http')) {
      validUrl = `https://${validUrl}`;
    }

    try {
      const urlObj = new URL(validUrl);
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        throw new Error('Geçersiz domain');
      }
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setDescription(`❌ Geçersiz URL: \`${link}\`\nLütfen geçerli bir link girin (örn: github.com/kullanici/proje)`);

      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Dil bilgileri - PNG ikonlarla (Discord uyumlu)
    const typeInfo = {
      javascript: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.png',
        label: 'JavaScript',
        color: '#F7DF1E'
      },
      python: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.png',
        label: 'Python',
        color: '#3776AB'
      },
      java: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.png',
        label: 'Java',
        color: '#007396'
      },
      cpp: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.png',
        label: 'C++',
        color: '#00599C'
      },
      csharp: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/csharp/csharp-original.png',
        label: 'C#',
        color: '#239120'
      },
      php: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/php/php-original.png',
        label: 'PHP',
        color: '#777BB4'
      },
      ruby: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/ruby/ruby-original.png',
        label: 'Ruby',
        color: '#CC342D'
      },
      go: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/go/go-original.png',
        label: 'Go',
        color: '#00ADD8'
      },
      rust: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/rust/rust-plain.png',
        label: 'Rust',
        color: '#000000'
      },
      typescript: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.png',
        label: 'TypeScript',
        color: '#3178C6'
      },
      htmlcss: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original.png',
        label: 'HTML/CSS',
        color: '#E34C26'
      },
      diğer: { 
        icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/code/code-original.png',
        label: 'Diğer',
        color: '#6E6E6E'
      }
    };

    const selectedType = typeInfo[normalizedType];

    // Paylaşım embed'i - Modern V6.0
    const shareEmbed = new EmbedBuilder()
      .setColor(selectedType.color)
      .setAuthor({ 
        name: `${message.author.username} • Geliştirici`, 
        iconURL: message.author.displayAvatarURL() 
      })
      .setTitle(`${selectedType.label} Projesi`)
      .setThumbnail(selectedType.icon)
      .setDescription(
        `### 💎 **Kod Paylaşımı**\n\n` +
        `** <:developer:1433172619632578620> Teknoloji:** \`${selectedType.label}\`\n` +
        `**<a:mod2:1416527520844615894> Geliştirici:** ${message.author}\n` +
        `**<:hastag:1441378933181251654> Tarih:** <t:${Math.floor(Date.now()/1000)}:D>\n\n` +
        `Aşağıdaki butondan koda erişebilirsiniz.`
      )
      .setFooter({ 
        text: 'Grave Kod Platformu', 
        iconURL: client.user.displayAvatarURL() 
      })
      .setTimestamp();

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Koda Git')
        .setStyle(ButtonStyle.Link)
        .setURL(validUrl)
        .setEmoji('<:yolla:1455559170232160520>')
    );

    await message.channel.send({ embeds: [shareEmbed], components: [buttonRow] });

  } catch (err) {
    console.error('Kod paylaşım hatası:', err);
    const errorEmbed = new EmbedBuilder()
      .setColor('#ED4245')
      .setDescription('❌ Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    
    await message.channel.send({ embeds: [errorEmbed] });
  }
};

module.exports.conf = { aliases: ['share'] };
module.exports.help = { name: 'kodpaylaş' };
