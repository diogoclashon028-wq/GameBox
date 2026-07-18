const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
// IMPORTANTE: 'roomManager.js' com M maiúsculo para funcionar no Render
const roomManager = require('../roomManager.js'); 

async function startVelha(interaction) {
  const channelId = interaction.channelId;
  const p1 = interaction.user;
  const p2 = interaction.options.getUser('oponente') || interaction.client.user; 
  const isBot = p2.id === interaction.client.user.id;

  if (p1.id === p2.id) return interaction.reply({ content: "❌ Oponente inválido.", ephemeral: true });
  if (roomManager.hasGame(channelId)) return interaction.reply({ content: "❌ Chat ocupado.", ephemeral: true });

  roomManager.createRoom(channelId, 'velha', [p1.id, p2.id]);
  let scores = { [p1.id]: 0, [p2.id]: 0 }, round = 1, board = Array(9).fill(null), turn = p1.id;

  function makeGrid() {
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const row = new ActionRowBuilder();
      for (let j = 0; j < 3; j++) {
        const idx = i * 3 + j;
        const label = board[idx] === 'X' ? '❌' : board[idx] === 'O' ? '⭕' : ' ';
        row.addComponents(new ButtonBuilder().setCustomId(`v_${idx}`).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(board[idx] !== null));
      }
      rows.push(row);
    }
    return rows;
  }

  function checkWin() {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let line of lines) if (board[line[0]] && board[line[0]] === board[line[1]] && board[line[0]] === board[line[2]]) return board[line[0]];
    if (board.every(cell => cell !== null)) return 'T';
    return null;
  }

  function botMove() {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let line of lines) {
      const cells = line.map(idx => board[idx]);
      if (cells.filter(c => c === 'O').length === 2 && cells.filter(c => c === null).length === 1) return line[cells.indexOf(null)];
    }
    for (let line of lines) {
      const cells = line.map(idx => board[idx]);
      if (cells.filter(c => c === 'X').length === 2 && cells.filter(c => c === null).length === 1) return line[cells.indexOf(null)];
    }
    if (board[4] === null) return 4;
    const empties = board.map((c, idx) => c === null ? idx : null).filter(v => v !== null);
    return empties[Math.floor(Math.random() * empties.length)];
  }

  async function handleEndRound(win, i) {
    let roundText = win === 'T' ? "👵 Empate!" : `🎉 <@${win === 'X' ? p1.id : p2.id}> ganhou a Rodada!`;
    if (win !== 'T') scores[win === 'X' ? p1.id : p2.id]++;

    if (scores[p1.id] === 2 || scores[p2.id] === 2) {
      const winner = scores[p1.id] === 2 ? p1.id : p2.id;
      const embed = new EmbedBuilder().setTitle("🏁 FIM").setDescription(`🏆 **Vencedor: <@${winner}>**\nPlacar: ${scores[p1.id]} x ${scores[p2.id]}`).setColor("#2ECC71");
      await i.update({ embeds: [embed], components: makeGrid().map(r => { r.components.forEach(b => b.setDisabled(true)); return r; }) });
      return collector.stop();
    }
    round++; board = Array(9).fill(null); turn = p1.id;
    await i.update({ embeds: [new EmbedBuilder().setTitle("❌ Velha ⭕").setDescription(`${roundText}\n\n**RODADA ${round}**\nTurno: <@${turn}>`).setColor("#5865F2")], components: makeGrid() });
  }

  const response = await interaction.reply({ embeds: [new EmbedBuilder().setTitle("❌ Velha ⭕").setDescription(`**RODADA 1**\nTurno de: <@${turn}>`).setColor("#5865F2")], components: makeGrid(), fetchReply: true });
  const collector = response.createMessageComponentCollector({ filter: i => i.user.id === p1.id || (i.user.id === p2.id && !isBot), time: 180000 });

  collector.on('collect', async i => {
    if (i.user.id !== turn) return i.reply({ content: "👉 Não é sua vez!", ephemeral: true });
    
    board[parseInt(i.customId.split('_')[1])] = 'X';
    let win = checkWin();
    if (win) return await handleEndRound(win, i);

    if (isBot) {
      const move = botMove();
      if (move !== undefined) board[move] = 'O';
      win = checkWin();
      if (win) return await handleEndRound(win, i);
      turn = p1.id;
    } else { turn = p2.id; }

    await i.update({ embeds: [new EmbedBuilder().setTitle("❌ Velha ⭕").setDescription(`**RODADA ${round}**\nTurno de: <@${turn}>`).setColor("#5865F2")], components: makeGrid() });
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}
module.exports = { startVelha };
