const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roomManager');

async function startVelha(interaction) {
  const channelId = interaction.channelId;
  const p1 = interaction.user;
  const p2 = interaction.options.getUser('oponente');

  if (!p2 || p2.bot || p1.id === p2.id) {
    return interaction.reply({ content: "❌ Mencione um amigo real para jogar com você.", ephemeral: true });
  }

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Este chat já está ocupado por outro jogo.", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'velha', [p1.id, p2.id]);

  let board = Array(9).fill(null);
  let turn = p1.id;

  function makeGrid() {
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const row = new ActionRowBuilder();
      for (let j = 0; j < 3; j++) {
        const index = i * 3 + j;
        const label = board[index] === 'X' ? '❌' : board[index] === 'O' ? '⭕' : ' ';
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`v_${index}`)
            .setLabel(label)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(board[index] !== null)
        );
      }
      rows.push(row);
    }
    return rows;
  }

  function checkWin() {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let line of lines) {
      if (board[line[0]] && board[line[0]] === board[line[1]] && board[line[0]] === board[line[2]]) return board[line[0]];
    }
    if (board.every(cell => cell !== null)) return 'T';
    return null;
  }

  const embed = new EmbedBuilder()
    .setTitle("❌ Jogo da Velha ⭕")
    .setDescription(`Turno atual: <@${turn}>`)
    .setColor("#5865F2");

  const response = await interaction.reply({ embeds: [embed], components: makeGrid(), fetchReply: true });

  const collector = response.createMessageComponentCollector({
    filter: i => i.user.id === p1.id || i.user.id === p2.id,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== turn) {
      return i.reply({ content: "👉 Não é o seu turno ainda!", ephemeral: true });
    }

    const index = parseInt(i.customId.split('_')[1]);
    board[index] = turn === p1.id ? 'X' : 'O';

    const win = checkWin();
    if (win) {
      embed.setDescription(win === 'T' ? "Empate! Deu velha 👵" : `🎉 Vitória de <@${turn}>!`);
      
      // Desativa todos os botões no final
      const finalGrid = makeGrid().map(row => {
        row.components.forEach(btn => btn.setDisabled(true));
        return row;
      });

      await i.update({ embeds: [embed], components: finalGrid });
      return collector.stop();
    }

    turn = turn === p1.id ? p2.id : p1.id;
    embed.setDescription(`Turno atual: <@${turn}>`);
    await i.update({ embeds: [embed], components: makeGrid() });
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startVelha };
