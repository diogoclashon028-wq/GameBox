const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roommanager.js'); // Caminho corrigido

async function startBlackjack(interaction) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;

  if (roomManager.hasGame(channelId)) return interaction.reply({ content: "❌ Chat ocupado.", ephemeral: true });
  roomManager.createRoom(channelId, 'blackjack', [userId]);

  const drawCard = () => Math.floor(Math.random() * 10) + 2;

  let playerPoints = drawCard() + drawCard();
  let botPoints = drawCard() + drawCard();

  const embed = new EmbedBuilder()
    .setTitle("🃏 Cassino Blackjack (21) 💸")
    .setDescription(`Seus pontos: **${playerPoints}**\nPontos da Banca: **?**\n\nEscolha o seu movimento nos botões!`)
    .setColor("#1ABC9C");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bj_hit').setLabel('Pedir Carta 🃏').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('bj_stand').setLabel('Parar 🛑').setStyle(ButtonStyle.Danger)
  );

  const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  const collector = response.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 60000 });

  collector.on('collect', async i => {
    if (i.customId === 'bj_hit') {
      playerPoints += drawCard();
      if (playerPoints > 21) {
        embed.setTitle("💥 ESTOUROU!").setDescription(`Seus pontos: **${playerPoints}**\nVocê ultrapassou 21 e perdeu! 🏦`).setColor("#E74C3C");
        await i.update({ embeds: [embed], components: [] });
        return collector.stop();
      }
      embed.setDescription(`Seus pontos: **${playerPoints}**\nPontos da Banca: **?**`);
      await i.update({ embeds: [embed] });
    }

    if (i.customId === 'bj_stand') {
      while (botPoints < 17) botPoints += drawCard();
      let msg = `Seus pontos: **${playerPoints}**\nPontos da Banca: **${botPoints}**\n\n`;

      if (botPoints > 21 || playerPoints > botPoints) msg += "🎉 **Você ganhou da banca!** 🎉";
      else if (playerPoints === botPoints) msg += "🤝 **Empate técnico!**";
      else msg += "🏦 **A banca ganhou de você!**";

      embed.setTitle("🏁 Resultado do Jogo").setDescription(msg).setColor("#F1C40F");
      await i.update({ embeds: [embed], components: [] });
      return collector.stop();
    }
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startBlackjack };
