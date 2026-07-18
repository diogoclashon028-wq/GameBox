const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roommanager.js'); 

async function startJokenpo(interaction) {
  const channelId = interaction.channelId;
  const p1 = interaction.user;
  // Se não mandou oponente, o bot assume!
  const p2 = interaction.options.getUser('oponente') || interaction.client.user; 
  const isBot = p2.id === interaction.client.user.id;

  if (p1.id === p2.id) return interaction.reply({ content: "❌ Você não pode jogar contra si mesmo.", ephemeral: true });
  if (roomManager.hasGame(channelId)) return interaction.reply({ content: "❌ Chat ocupado.", ephemeral: true });

  roomManager.createRoom(channelId, 'jokenpo', [p1.id, p2.id]);

  let scores = { [p1.id]: 0, [p2.id]: 0 };
  let round = 1;
  let choices = {};

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('jk_pedra').setLabel('Pedra ✊').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('jk_papel').setLabel('Papel ✋').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('jk_tesoura').setLabel('Tesoura ✌️').setStyle(ButtonStyle.Danger)
  );

  const response = await interaction.reply({
    embeds: [new EmbedBuilder().setTitle("✊ Jokenpô ✌️").setDescription(`**RODADA 1**\n<@${p1.id}> VS ${isBot ? '🤖 Bot' : `<@${p2.id}>`}\nEscolham sua jogada!`).setColor("#5865F2")],
    components: [row],
    fetchReply: true
  });

  const collector = response.createMessageComponentCollector({ filter: i => i.user.id === p1.id || i.user.id === p2.id, time: 60000 });

  collector.on('collect', async i => {
    if (choices[i.user.id]) return i.reply({ content: "❌ Você já escolheu!", ephemeral: true });

    choices[i.user.id] = i.customId;
    
    // Se for contra o bot, o bot joga na mesma hora
    if (isBot && i.user.id === p1.id) {
      const opcoesBot = ['jk_pedra', 'jk_papel', 'jk_tesoura'];
      choices[p2.id] = opcoesBot[Math.floor(Math.random() * 3)];
    } else {
      await i.reply({ content: "✅ Jogada salva!", ephemeral: true });
    }

    if (choices[p1.id] && choices[p2.id]) {
      const c1 = choices[p1.id];
      const c2 = choices[p2.id];
      choices = {}; 

      let roundResult = "";
      if (c1 === c2) roundResult = `**Empate!** Ambos jogaram igual.`;
      else if ((c1 === 'jk_pedra' && c2 === 'jk_tesoura') || (c1 === 'jk_papel' && c2 === 'jk_pedra') || (c1 === 'jk_tesoura' && c2 === 'jk_papel')) {
        scores[p1.id]++; roundResult = `<@${p1.id}> venceu a rodada!`;
      } else {
        scores[p2.id]++; roundResult = `${isBot ? '🤖 Bot' : `<@${p2.id}>`} venceu a rodada!`;
      }

      if (scores[p1.id] === 2 || scores[p2.id] === 2) {
        const winner = scores[p1.id] === 2 ? p1.id : p2.id;
        const embed = new EmbedBuilder().setTitle("🏁 Fim de Jogo!").setDescription(`${roundResult}\n\n🏆 **VENCEDOR: <@${winner}>**\n\n**Placar:**\n<@${p1.id}>: ${scores[p1.id]}\n${isBot ? '🤖 Bot' : `<@${p2.id}>`}: ${scores[p2.id]}`).setColor("#2ECC71");
        await (i.replied ? interaction.editReply({ embeds: [embed], components: [] }) : i.update({ embeds: [embed], components: [] }));
        return collector.stop();
      }

      round++;
      const embed = new EmbedBuilder().setTitle("✊ Jokenpô ✌️").setDescription(`${roundResult}\n\n**RODADA ${round}**\nPlacar: ${scores[p1.id]} x ${scores[p2.id]}`).setColor("#5865F2");
      await (i.replied ? interaction.editReply({ embeds: [embed], components: [row] }) : i.update({ embeds: [embed], components: [row] }));
    }
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}
module.exports = { startJokenpo };
