const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roomManager');

async function startJokenpo(interaction) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Já existe um jogo rodando neste chat. Aguarde ou use outro canal!", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'jokenpo', [userId]);

  const embed = new EmbedBuilder()
    .setTitle("✊ Jokenpô Janela Virtual ✌️")
    .setDescription("Escolha sua jogada nos botões abaixo!")
    .setColor("#5865F2")
    .setFooter({ text: "Você tem 30 segundos para jogar." });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('jk_pedra').setLabel('Pedra ✊').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('jk_papel').setLabel('Papel ✋').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('jk_tesoura').setLabel('Tesoura ✌️').setStyle(ButtonStyle.Danger)
  );

  const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  const collector = response.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 30000
  });

  collector.on('collect', async i => {
    const choices = ['jk_pedra', 'jk_papel', 'jk_tesoura'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const userChoice = i.customId;

    let result = "";
    if (userChoice === botChoice) result = "Empate! 🤝";
    else if (
      (userChoice === 'jk_pedra' && botChoice === 'jk_tesoura') ||
      (userChoice === 'jk_papel' && botChoice === 'jk_pedra') ||
      (userChoice === 'jk_tesoura' && botChoice === 'jk_papel')
    ) {
      result = "Você venceu! 🎉";
    } else {
      result = "O Bot venceu! 🤖";
    }

    const format = (id) => id.replace('jk_', '').toUpperCase();

    const endEmbed = new EmbedBuilder()
      .setTitle("🏁 Resultado do Jokenpô")
      .setDescription(`Você escolheu: **${format(userChoice)}**\nBot escolheu: **${format(botChoice)}**\n\n**${result}**`)
      .setColor("#2F3136");

    await i.update({ embeds: [endEmbed], components: [] });
    collector.stop();
  });

  collector.on('end', () => {
    roomManager.destroyRoom(channelId);
  });
}

module.exports = { startJokenpo };
