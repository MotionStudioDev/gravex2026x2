const { REST, Routes } = require('discord.js');
const fs = require('fs');

// Token sadece process.env'den alınır
const TOKEN = process.env.TOKEN;

// Diğer bilgiler doğrudan yazılır
const CLIENT_ID = '1066016782827130960';
const TEST_GUILD_ID = '1438817745063116881';

const commands = [];
const commandFiles = fs.readdirSync('./komutlar').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./komutlar/${file}`);
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔄 Slash komutlar yükleniyor...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, TEST_GUILD_ID),
      { body: commands }
    );
    console.log('✅ Test sunucusuna yüklendi.');

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log('🌍 Global komutlar yüklendi.');
  } catch (error) {
    console.error('❌ Hata:', error);
  }
})();
