const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const roomManager = require('../roomManager.js');

async function startAkinator(interaction) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;

  if (roomManager.hasGame(channelId)) return interaction.reply({ content: "❌ Chat ocupado.", ephemeral: true });
  roomManager.createRoom(channelId, 'akinator', [userId]);

  let currentId = 1;
  const tree = {
    1: { q: "O seu personagem é real?", sim: 2, nao: 3 },
    2: { q: "Ele nasceu no Brasil?", sim: 4, nao: 5 },
    3: { q: "Ele é de um anime?", sim: 6, nao: 7 },
    4: { q: "Ele joga ou jogava futebol?", sim: "Neymar Jr. ⚽", nao: "Silvio Santos 📺" },
    5: { q: "Ele foi um presidente famoso?", sim: "Abraham Lincoln 🇺🇸", nao: "Cristiano Ronaldo 🇵🇹" },
    6: { q: "Ele tem cabelo espetado?", sim: "Goku (Dragon Ball) 🐉", nao: "Naruto Uzumaki 🦊" },
    7: { q: "Ele voa e usa uma capa?", sim: "Superman 🦸‍♂️", nao: "Batman 🦇" }
  };

  const makeRow = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ak_sim').setLabel('Sim ✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ak_nao').setLabel('Não ❌').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ak_sair').setLabel('Sair 🚪').setStyle(ButtonStyle.Secondary)
  );

  const embed = new EmbedBuilder().setTitle("🔮 Akinator Super Inteligente 🧞‍♂️").setDescription(tree[currentId].q).setColor("#3498DB");
  const response = await interaction.reply({ embeds: [embed], components: [makeRow()], fetchReply: true });
  const collector = response.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 90000 });

  collector.on('collect', async i => {
    if (i.customId === 'ak_sair') {
      embed.setDescription("🚪 Você saiu do jogo.");
      await i.update({ embeds: [embed], components: [] });
      return collector.stop();
    }

    const answer = i.customId === 'ak_sim' ? 'sim' : 'nao';
    const nextNode = tree[currentId][answer];

    if (typeof nextNode === 'string') {
      embed.setTitle("🧙‍♂️ O Gênio Adivinhou!").setDescription(`Pensei bem e o seu personagem é:\n\n✨ **${nextNode}** ✨`).setColor("#2ECC71");
      await i.update({ embeds: [embed], components: [] });
      return collector.stop();
    }

    currentId = nextNode;
    embed.setDescription(tree[currentId].q);
    await i.update({ embeds: [embed] });
  });

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startAkinator };
