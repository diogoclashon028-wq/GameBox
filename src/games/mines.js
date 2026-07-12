const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roomManager.js');

async function startMines(interaction) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;

  if (roomManager.hasGame(channelId)) return interaction.reply({ content: "❌ Chat ocupado.", ephemeral: true });
  roomManager.createRoom(channelId, 'mines', [userId]);

  let board = Array(10).fill('💎');
  const bombIndex = Math.floor(Math.random() * 10);
  board[bombIndex] = '💣';

  function makeGrid(revealed = []) {
    const rows = [];
    for (let i = 0; i < 2; i++) {
      const row = new ActionRowBuilder();
      for (let j = 0; j < 5; j++) {
        const idx = i * 5 + j;
        const isRev = revealed.includes(idx);
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`m_${idx}`)
            .setLabel(isRev ? board[idx] : '❓')
            .setStyle(isRev ? (board[idx] === '💣' ? ButtonStyle.Danger : ButtonStyle.Success) : ButtonStyle.Secondary)
            .setDisabled(isRev)
        );
      }
      rows.push(row);
    }
    return rows;
  }

  let revealedIndices = [];
  const embed = new EmbedBuilder().setTitle("💣 Campo Minado (Mines) 💎").setDescription("Clique nos botões e ache os diamantes! Evite a bomba.").setColor("#E67E22");

  const response = await interaction.reply({ embeds: [embed], components: makeGrid(), fetchReply: true });
  const collector = response.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 60000 });

  collector.on('collect', async i => {
    const idx = parseInt(i.customId.split('_')[1]);
    revealedIndices.push(idx);

    if (board[idx] === '💣') {
      embed.setTitle("💥 EXPLODIU!").setDescription("Você clicou na bomba e perdeu tudo! 😭").setColor("#FF0000");
      all = Array.from({length: 10}, (_, k) => k);
      await i.update({ embeds: [embed], components: makeGrid(all) });
      return collector.stop();
    }

    if (revealedIndices.length === 9) {
      embed.setTitle("🏆 VITÓRIA INCRÍVEL!").setDescription("Você limpou o campo e achou todos os diamantes! 🎉").setColor("#2ECC71");
      await i.update({ embeds: [embed], components: makeGrid(revealedIndices) });
      return collector.stop();
    }

    await i.update({ components: makeGrid(revealedIndices) });
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startMines };

