const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'ping', // Prefix komutlarında çalışacak komut adı: !ping
    description: 'Botun gecikme sürelerini gösterir.',

    /**
     * @param {Client} client 
     * @param {Message} message 
     * @param {string[]} args 
     */
    async execute(client, message, args) {
        // Önce 'Pong!' yazan bir mesaj gönderiyoruz
        const msg = await message.channel.send("Ping ölçülüyor...");

        // Mesaj gecikmesini hesapla: Gönderilen mesajın oluşturulma süresi ile yeni mesajın gönderilme süresi arasındaki fark.
        const latency = msg.createdTimestamp - message.createdTimestamp;

        // API gecikmesini al: Discord.js'in bot ile Discord API arasındaki gecikme süresi.
        const apiLatency = client.ws.ping;

        const embed = new EmbedBuilder()
            .setColor(0x00cc99)
            .setTitle("🏓 Pong!")
            .addFields(
                { name: "Mesaj Gecikmesi", value: `\`${latency}ms\``, inline: true },
                { name: "API Gecikmesi", value: `\`${apiLatency}ms\``, inline: true }
            )
            .setTimestamp();
        
        // Ölçüm mesajını düzenleyip sonucu gösteriyoruz
        msg.edit({ content: `**${message.author.username}**, işte gecikme sürem!`, embeds: [embed] });
    }
};
