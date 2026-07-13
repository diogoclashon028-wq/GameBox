const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const roomManager = require('../roomManager.js');

async function startTelefone(interaction) {
  const channelId = interaction.channelId;
  const host = interaction.user;

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Este chat já está ocupado por outro jogo.", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'telefone', [host.id]);

  let players = [];
  let gameStarted = false;
  let messages = [];

  const embedSetup = new EmbedBuilder()
    .setTitle("📞 Telefone Sem Fio - Jogo da Corrente 📞")
    .setDescription(`**Anfitrião:** <@${host.id}>\n\nMáximo 5 jogadores. Clique para participar!`)
    .setColor("#9B59B6");

  const rowSetup = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('t_entrar').setLabel('Participar 📱').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('t_iniciar').setLabel('Começar 📞').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('t_sair').setLabel('Sair ❌').setStyle(ButtonStyle.Danger)
  );

  const response = await interaction.reply({ embeds: [embedSetup], components: [rowSetup], fetchReply: true });
  const collector = response.createMessageComponentCollector({ time: 600000 });

  collector.on('collect', async i => {
    if (i.customId === 't_entrar') {
      if (gameStarted) return i.reply({ content: "❌ O jogo já começou!", ephemeral: true });
      if (players.some(p => p.id === i.user.id)) return i.reply({ content: "❌ Você já está no jogo!", ephemeral: true });
      if (players.length >= 5) return i.reply({ content: "❌ Máximo de 5 jogadores já atingido!", ephemeral: true });

      players.push(i.user);
      embedSetup.setDescription(`**Anfitrião:** <@${host.id}>\n\n**Jogadores (${players.length}/5):**\n${players.map(p => `• <@${p.id}>`).join('\n')}`);
      await i.update({ embeds: [embedSetup] });
      return i.reply({ content: "✅ Você entrou no jogo!", ephemeral: true });
    }

    if (i.customId === 't_iniciar') {
      if (i.user.id !== host.id) return i.reply({ content: "❌ Apenas o anfitrião pode iniciar!", ephemeral: true });
      if (players.length < 1) return i.reply({ content: "❌ Precisa de pelo menos 1 jogador!", ephemeral: true });

      gameStarted = true;
      await startChain(i);
    }

    if (i.customId === 't_sair') {
      if (!gameStarted) {
        players = players.filter(p => p.id !== i.user.id);
        embedSetup.setDescription(`**Anfitrião:** <@${host.id}>\n\n**Jogadores (${players.length}/5):**\n${players.map(p => `• <@${p.id}>`).join('\n') || 'Nenhum'}`);
        await i.update({ embeds: [embedSetup] });
        return i.reply({ content: "✅ Você saiu do jogo!", ephemeral: true });
      }
      return i.reply({ content: "❌ Jogo já começou, não é possível sair!", ephemeral: true });
    }
  });

  async function startChain(inter) {
    // Primeiro jogador define a frase secreta
    const modal = new ModalBuilder()
      .setCustomId('t_frase_modal')
      .setTitle('Frase Secreta do Telefone')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('t_frase_input')
            .setLabel('Digite a frase inicial')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(100)
        )
      );

    await interaction.showModal(modal);

    try {
      const modalSubmit = await interaction.awaitModalSubmit({ time: 60000 });
      const initialMessage = modalSubmit.fields.getTextInputValue('t_frase_input');
      messages.push({ from: players[0].username, to: players[1]?.username || 'Fim', text: initialMessage });

      await modalSubmit.reply({ content: "✅ Frase recebida! Encaminhando para o próximo...", ephemeral: true });

      // Passa a frase para cada jogador subsequente
      for (let idx = 1; idx < players.length; idx++) {
        const currentPlayer = players[idx];
        const previousMessage = messages[messages.length - 1].text;

        try {
          await currentPlayer.send(
            `📱 Sua vez no Telefone Sem Fio!\n\n**Mensagem recebida:**\n"${previousMessage}"\n\nDescreva com suas palavras o que você entendeu. Você tem 30 segundos!`
          );

          // Aguarda resposta via DM
          const dmCollector = currentPlayer.createDMCollector({ time: 30000, max: 1 });
          
          dmCollector.on('collect', msg => {
            messages.push({
              from: currentPlayer.username,
              to: players[idx + 1]?.username || 'Fim',
              text: msg.content
            });
            msg.reply('✅ Mensagem enviada para o próximo!');
          });

          await new Promise(resolve => {
            dmCollector.on('end', () => resolve());
          });
        } catch (e) {
          console.log(`Erro ao enviar DM para ${currentPlayer.username}`, e);
        }

        // Espera 2 segundos antes de passar para o próximo
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Exibe resultado final
      let resultText = '**📞 Linha do Tempo do Telefone:**\n\n';
      messages.forEach((msg, idx) => {
        resultText += `**${idx + 1}. ${msg.from}:**\n"${msg.text}"\n\n`;
      });

      const resultEmbed = new EmbedBuilder()
        .setTitle("📞 Resultado Final do Telefone Sem Fio 📞")
        .setDescription(resultText)
        .setColor("#9B59B6");

      await inter.editReply({ embeds: [resultEmbed], components: [] });
      collector.stop();
    } catch (e) {
      console.log('Erro na coleta do modal:', e);
      collector.stop();
    }
  }

  collector.on('end', () => {
    roomManager.destroyRoom(channelId);
  });
}

module.exports = { startTelefone };
