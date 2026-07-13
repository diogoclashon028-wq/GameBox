const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roomManager.js');

async function startAdedonha(interaction) {
  const channelId = interaction.channelId;
  const host = interaction.user;

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Este chat já está ocupado por outro jogo.", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'adedonha', [host.id]);

  let players = [];
  let gameStarted = false;
  let currentRound = 1;
  let scores = {};

  const embedSetup = new EmbedBuilder()
    .setTitle("🎯 Adedonha/Stop - Jogo de Palavras 🎯")
    .setDescription(`**Anfitrião:** <@${host.id}>\n\nClique para participar!`)
    .setColor("#F39C12");

  const rowSetup = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('a_entrar').setLabel('Participar 🎲').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('a_iniciar').setLabel('Começar 🎯').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('a_sair').setLabel('Sair ❌').setStyle(ButtonStyle.Danger)
  );

  const response = await interaction.reply({ embeds: [embedSetup], components: [rowSetup], fetchReply: true });
  const collector = response.createMessageComponentCollector({ time: 600000 });

  collector.on('collect', async i => {
    if (i.customId === 'a_entrar') {
      if (gameStarted) return i.reply({ content: "❌ O jogo já começou!", ephemeral: true });
      if (players.some(p => p.id === i.user.id)) return i.reply({ content: "❌ Você já está no jogo!", ephemeral: true });

      players.push(i.user);
      scores[i.user.id] = 0;
      embedSetup.setDescription(`**Anfitrião:** <@${host.id}>\n\n**Jogadores (${players.length}):**\n${players.map(p => `• <@${p.id}>`).join('\n')}`);
      await i.update({ embeds: [embedSetup] });
      return i.reply({ content: "✅ Você entrou no jogo!", ephemeral: true });
    }

    if (i.customId === 'a_iniciar') {
      if (i.user.id !== host.id) return i.reply({ content: "❌ Apenas o anfitrião pode iniciar!", ephemeral: true });
      if (players.length === 0) return i.reply({ content: "❌ Precisa de pelo menos 1 jogador!", ephemeral: true });

      gameStarted = true;
      await runGame(i);
    }

    if (i.customId === 'a_sair') {
      if (!gameStarted) {
        players = players.filter(p => p.id !== i.user.id);
        delete scores[i.user.id];
        embedSetup.setDescription(`**Anfitrião:** <@${host.id}>\n\n**Jogadores (${players.length}):**\n${players.map(p => `• <@${p.id}>`).join('\n') || 'Nenhum'}`);
        await i.update({ embeds: [embedSetup] });
        return i.reply({ content: "✅ Você saiu do jogo!", ephemeral: true });
      }
      return i.reply({ content: "❌ Jogo já começou!", ephemeral: true });
    }
  });

  async function runGame(inter) {
    const categories = ['Nome', 'Objeto', 'Cor'];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    for (let round = 1; round <= 3; round++) {
      currentRound = round;
      const sortedLetter = alphabet[Math.floor(Math.random() * alphabet.length)];

      const embed = new EmbedBuilder()
        .setTitle(`🎯 Adedonha - Rodada ${round}/3 🎯`)
        .setDescription(`**Letra Sorteada:** 🔤 **${sortedLetter}** 🔤\n\n**Categorias:**\n1. ${categories[0]}\n2. ${categories[1]}\n3. ${categories[2]}\n\n*Digite suas respostas no chat! Primeira pessoa a acertar as 3 ganha a rodada.*`)
        .setColor("#F39C12");

      await inter.editReply({ embeds: [embed], components: [] });

      const responses = {};
      let roundWinner = null;
      let roundEnded = false;

      const gameCollector = inter.channel.createMessageCollector({
        filter: msg => players.some(p => p.id === msg.author.id) && msg.content.split(' ').length >= 3,
        time: 45000
      });

      gameCollector.on('collect', msg => {
        if (roundEnded) return;

        const userId = msg.author.id;
        if (responses[userId]) return;

        const words = msg.content.split(' ').map(w => w.trim()).slice(0, 3);

        if (words.length === 3 && words.every(w => w.toLowerCase().startsWith(sortedLetter.toLowerCase()))) {
          responses[userId] = words;
          scores[userId]++;
          roundWinner = msg.author;
          roundEnded = true;
          gameCollector.stop();

          msg.reply(`🎉 **${msg.author.username}** acertou e ganhou a rodada!`);
        } else {
          msg.reply(`❌ Respostas inválidas. Todas devem começar com **${sortedLetter}** e ser 3 palavras.`);
        }
      });

      await new Promise(resolve => {
        gameCollector.on('end', () => resolve());
      });

      // Pausa entre rodadas
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Exibe placar final
    const finalEmbed = new EmbedBuilder()
      .setTitle("🏆 Resultado Final do Adedonha 🏆")
      .setDescription(
        players
          .map(p => `<@${p.id}>: **${scores[p.id] || 0}** pontos`)
          .join('\n')
      )
      .setColor("#F39C12");

    await inter.editReply({ embeds: [finalEmbed], components: [] });
    collector.stop();
  }

  collector.on('end', () => {
    roomManager.destroyRoom(channelId);
  });
}

module.exports = { startAdedonha };
