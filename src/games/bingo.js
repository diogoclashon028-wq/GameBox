const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roomManager.js');

async function startBingo(interaction) {
  const channelId = interaction.channelId;
  const host = interaction.user;

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Este chat já está ocupado por outro jogo.", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'bingo', [host.id]);

  let players = [];
  let gameStarted = false;
  let drawnNumbers = new Set();
  let playerCards = {};
  let gameEnded = false;

  const embedSetup = new EmbedBuilder()
    .setTitle("🎡 BINGO - Jogo de Sorte 🎡")
    .setDescription(`**Anfitrião:** <@${host.id}>\n\nClique no botão abaixo para participar! Aguardando início...`)
    .setColor("#FF6B9D");

  const rowSetup = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('b_entrar').setLabel('Participar 🎫').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('b_iniciar').setLabel('Começar 🎡').setStyle(ButtonStyle.Success)
  );

  const response = await interaction.reply({ embeds: [embedSetup], components: [rowSetup], fetchReply: true });
  const collector = response.createMessageComponentCollector({ time: 600000 });

  collector.on('collect', async i => {
    if (i.customId === 'b_entrar') {
      if (gameStarted) return i.reply({ content: "❌ O jogo já começou!", ephemeral: true });
      if (players.some(p => p.id === i.user.id)) return i.reply({ content: "❌ Você já está no jogo!", ephemeral: true });

      players.push(i.user);
      const card = generateCard();
      playerCards[i.user.id] = card;

      embedSetup.setDescription(`**Anfitrião:** <@${host.id}>\n\n**Jogadores (${players.length}):**\n${players.map(p => `• <@${p.id}>`).join('\n')}`);
      await i.update({ embeds: [embedSetup] });

      try {
        await i.user.send(`🎫 Sua cartela de BINGO:\n\n${formatCard(card)}`);
      } catch (e) {}

      return i.reply({ content: "✅ Você entrou no jogo! Sua cartela foi enviada na DM.", ephemeral: true });
    }

    if (i.customId === 'b_iniciar') {
      if (i.user.id !== host.id) return i.reply({ content: "❌ Apenas o anfitrião pode iniciar!", ephemeral: true });
      if (players.length === 0) return i.reply({ content: "❌ Precisa de pelo menos 1 jogador!", ephemeral: true });

      gameStarted = true;
      await runBingo(i);
    }

    if (i.customId === 'b_bingo') {
      if (gameEnded) return i.reply({ content: "❌ Jogo já acabou!", ephemeral: true });
      if (!playerCards[i.user.id]) return i.reply({ content: "❌ Você não está no jogo!", ephemeral: true });

      const card = playerCards[i.user.id];
      const isWinner = card.every(num => drawnNumbers.has(num));

      if (isWinner) {
        await i.reply({ content: "🎉 **BINGO! VOCÊ GANHOU!** 🎉", ephemeral: false });
        gameEnded = true;
        collector.stop();
      } else {
        try {
          await i.user.send(`❌ Sua cartela ainda não está completa. Números que faltam:\n${card.filter(n => !drawnNumbers.has(n)).join(', ')}`);
        } catch (e) {}
        await i.reply({ content: "❌ Sua cartela ainda não está pronta! Verifique sua DM.", ephemeral: true });
      }
    }
  });

  async function runBingo(inter) {
    const drawInterval = setInterval(async () => {
      if (gameEnded) {
        clearInterval(drawInterval);
        return;
      }

      let newNumber;
      do {
        newNumber = Math.floor(Math.random() * 30) + 1;
      } while (drawnNumbers.has(newNumber));

      drawnNumbers.add(newNumber);

      const embed = new EmbedBuilder()
        .setTitle("🎡 BINGO - Números Sorteados 🎡")
        .setDescription(`**Números:** ${Array.from(drawnNumbers).sort((a, b) => a - b).join(', ')}\n\n**Sorteados:** ${drawnNumbers.size}/30`)
        .setColor("#FF6B9D");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('b_bingo').setLabel('BINGO! 🎉').setStyle(ButtonStyle.Danger)
      );

      try {
        await inter.editReply({ embeds: [embed], components: [row] });
      } catch (e) {}
    }, 5000);
  }

  function generateCard() {
    const card = [];
    while (card.length < 5) {
      const num = Math.floor(Math.random() * 30) + 1;
      if (!card.includes(num)) card.push(num);
    }
    return card.sort((a, b) => a - b);
  }

  function formatCard(card) {
    return card.map(n => `[${n.toString().padStart(2, ' ')}]`).join(' ');
  }

  collector.on('end', () => {
    roomManager.destroyRoom(channelId);
  });
}

module.exports = { startBingo };
