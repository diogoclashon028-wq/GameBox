const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roomManager.js');

async function startJokenpo(interaction) {
  const channelId = interaction.channelId;
  const p1 = interaction.user;
  const p2 = interaction.options.getUser('oponente');

  if (!p2 || p2.bot || p1.id === p2.id) {
    return interaction.reply({ content: "❌ Mencione um amigo real para jogar Jokenpô com você.", ephemeral: true });
  }

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Este chat já tem um jogo rodando.", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'jokenpo', [p1.id, p2.id]);

  let scores = { [p1.id]: 0, [p2.id]: 0 };
  let round = 1;
  let choices = {};

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('jk_pedra').setLabel('Pedra ✊').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('jk_papel').setLabel('Papel ✋').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('jk_tesoura').setLabel('Tesoura ✌️').setStyle(ButtonStyle.Danger)
  );

  async function updateRoundEmbed(inter, textStatus = "") {
    const embed = new EmbedBuilder()
      .setTitle("✊ Jokenpô em Dupla ✌️")
      .setDescription(`${textStatus}\n**Placar:**\n<@${p1.id}>: ${scores[p1.id]} 🏆\n<@${p2.id}>: ${scores[p2.id]} 🏆\n\n**RODADA ${round}**\nAmbos devem escolher abaixo de forma secreta!`)
      .setColor("#5865F2")
      .setFooter({ text: "Melhor de 3 rodadas!" });

    if (inter.replied || inter.deferred) {
      await inter.editReply({ embeds: [embed], components: [row] });
    } else {
      await inter.update({ embeds: [embed], components: [row] });
    }
  }

  const response = await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("✊ Jokenpô em Dupla ✌️")
        .setDescription(`**RODADA 1**\n<@${p1.id}> VS <@${p2.id}>\nEscolham sua jogada nos botões abaixo!`)
        .setColor("#5865F2")
    ],
    components: [row],
    fetchReply: true
  });

  const collector = response.createMessageComponentCollector({
    filter: i => i.user.id === p1.id || i.user.id === p2.id,
    time: 120000
  });

  collector.on('collect', async i => {
    if (choices[i.user.id]) {
      return i.reply({ content: "❌ Você já fez sua escolha nesta rodada!", ephemeral: true });
    }

    choices[i.user.id] = i.customId;
    await i.reply({ content: "✅ Jogada salva em segredo!", ephemeral: true });

    if (choices[p1.id] && choices[p2.id]) {
      const c1 = choices[p1.id];
      const c2 = choices[p2.id];
      choices = {}; 

      let roundResult = "";
      if (c1 === c2) {
        roundResult = `**Rodada ${round}: Empate!** Ambos escolheram o mesmo.`;
      } else if (
        (c1 === 'jk_pedra' && c2 === 'jk_tesoura') ||
        (c1 === 'jk_papel' && c2 === 'jk_pedra') ||
        (c1 === 'jk_tesoura' && c2 === 'jk_papel')
      ) {
        scores[p1.id]++;
        roundResult = `**Rodada ${round}:** <@${p1.id}> venceu a rodada!`;
      } else {
        scores[p2.id]++;
        roundResult = `**Rodada ${round}:** <@${p2.id}> venceu a rodada!`;
      }

      if (scores[p1.id] === 2 || scores[p2.id] === 2) {
        const winner = scores[p1.id] === 2 ? p1.id : p2.id;
        const finalEmbed = new EmbedBuilder()
          .setTitle("🏁 Fim de Jogo!")
          .setDescription(`${roundResult}\n\n🎉 **🏆 <@${winner}> GANHOU O JOKENPÔ NA MELHOR DE 3!** 🏆\n\n**Placar Final:**\n<@${p1.id}>: ${scores[p1.id]}\n<@${p2.id}>: ${scores[p2.id]}`)
          .setColor("#2ECC71");

        await interaction.editReply({ embeds: [finalEmbed], components: [] });
        return collector.stop();
      }

      round++;
      await updateRoundEmbed(interaction, roundResult);
    }
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startJokenpo };
