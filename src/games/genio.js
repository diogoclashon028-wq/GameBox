const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roomManager.js');

async function startGenio(interaction) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;

  if (roomManager.hasGame(channelId)) return interaction.reply({ content: "❌ Chat ocupado.", ephemeral: true });
  roomManager.createRoom(channelId, 'genio', [userId]);

  const colors = ['🔴', '🔵', '🟢', '🟡'];
  let sequence = [colors[Math.floor(Math.random() * 4)]];
  let playerSequence = [];

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('g_0').setLabel('🔴').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('g_1').setLabel('🔵').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('g_2').setLabel('🟢').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('g_3').setLabel('🟡').setStyle(ButtonStyle.Secondary)
  );

  const embed = new EmbedBuilder()
    .setTitle("🧠 Jogo Gênio (Memory Game) 🧠")
    .setDescription(`Decore a sequência piscada pelo gênio:\n\n➡️ **${sequence.join(' ')}**\n\n*Clique nas cores na mesma ordem!*`)
    .setColor("#9B59B6");

  const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  const collector = response.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 60000 });

  collector.on('collect', async i => {
    const clickedColor = colors[parseInt(i.customId.split('_')[1])];
    playerSequence.push(clickedColor);

    const currentCheckIdx = playerSequence.length - 1;
    if (playerSequence[currentCheckIdx] !== sequence[currentCheckIdx]) {
      embed.setTitle("❌ SEQUÊNCIA ERRADA!").setDescription(`Você errou a ordem!\nPontuação máxima: **${sequence.length - 1} pontos** 🏅`).setColor("#E74C3C");
      await i.update({ embeds: [embed], components: [] });
      return collector.stop();
    }

    if (playerSequence.length === sequence.length) {
      playerSequence = [];
      sequence.push(colors[Math.floor(Math.random() * 4)]);
      embed.setDescription(`✨ **Acertou!** Próximo nível:\n\n➡️ **${sequence.join(' ')}**`);
      await i.update({ embeds: [embed] });
    } else {
      await i.deferUpdate();
    }
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startGenio };

