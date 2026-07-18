const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
// Importação corrigida com M maiúsculo para funcionar no Render
const roomManager = require('../roomManager.js'); 

async function startBingo(interaction) {
  const channelId = interaction.channelId;
  const host = interaction.user;

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Este chat já está ocupado por outro jogo.", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'bingo', [host.id]);

  let numerosSorteados = [];

  const embed = new EmbedBuilder()
    .setTitle("🎰 Rodada de Bingo! 🎟️")
    .setDescription(`**Anfitrião:** <@${host.id}>\n\nPreparem suas cartelas! O anfitrião pode sortear os números usando o botão abaixo.`)
    .setColor("#F1C40F");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bg_sortear').setLabel('Sortear Número 🔀').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('bg_encerrar').setLabel('Encerrar Jogo 🏁').setStyle(ButtonStyle.Danger)
  );

  const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  const collector = response.createMessageComponentCollector({ time: 600000 }); // 10 minutos de jogo

  collector.on('collect', async i => {
    if (i.user.id !== host.id) {
      return i.reply({ content: "❌ Apenas o anfitrião do Bingo pode controlar o sorteio!", ephemeral: true });
    }

    if (i.customId === 'bg_sortear') {
      if (numerosSorteados.length >= 75) {
        return i.reply({ content: "❌ Todos os números (1 a 75) já foram sorteados!", ephemeral: true });
      }

      let numero;
      do {
        numero = Math.floor(Math.random() * 75) + 1;
      } while (numerosSorteados.includes(numero));

      numerosSorteados.push(numero);

      // Organiza a lista para exibição
      const listaExibicao = [...numerosSorteados].sort((a, b) => a - b).join(', ');

      embed.setDescription(`**Anfitrião:** <@${host.id}>\n\n🔢 Último número sorteado: **${numero}**\n\n📋 **Números já chamados (${numerosSorteados.length}):**\n${listaExibicao}`);
      await i.update({ embeds: [embed] });
    }

    if (i.customId === 'bg_encerrar') {
      const listaExibicao = [...numerosSorteados].sort((a, b) => a - b).join(', ');
      
      embed.setTitle("🏁 Bingo Encerrado!")
        .setDescription(`O jogo foi finalizado pelo anfitrião.\n\n📋 **Lista final de números sorteados:**\n${listaExibicao || 'Nenhum número foi sorteado.'}`)
        .setColor("#E74C3C");
      await i.update({ embeds: [embed], components: [] });
      collector.stop();
    }
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startBingo };
