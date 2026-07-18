const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roommanager.js'); // Alterado para minúsculo

async function startAkinator(interaction) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Este chat já tem um jogo rodando.", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'akinator', [userId]);

  let step = 0;
  const questions = [
    "O seu personagem é real?",
    "O seu personagem é um homem?",
    "O seu personagem é de um anime?",
    "O seu personagem luta ou tem superpoderes?",
    "O seu personagem usa roupas azuis ou capa?"
  ];

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ak_sim').setLabel('Sim').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ak_nao').setLabel('Não').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ak_naosei').setLabel('Não Sei').setStyle(ButtonStyle.Secondary)
  );

  const embed = new EmbedBuilder()
    .setTitle("🔮 Akinator Virtual 🧞‍♂️")
    .setDescription(`**Pergunta 1:**\n${questions[0]}`)
    .setColor("#3498DB");

  const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  const collector = response.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 60000 });

  collector.on('collect', async i => {
    step++;
    if (step < questions.length) {
      embed.setDescription(`**Pergunta ${step + 1}:**\n${questions[step]}`);
      await i.update({ embeds: [embed] });
    } else {
      embed.setTitle("🤔 Palpite do Gênio!")
        .setDescription("Pensei bem nas suas respostas...\n\nO seu personagem é o **Goku** ou o **Superman**! Acertei? 🧙‍♂️")
        .setColor("#2ECC71");
      await i.update({ embeds: [embed], components: [] });
      collector.stop();
    }
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startAkinator };
