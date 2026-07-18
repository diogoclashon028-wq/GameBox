require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');

// Importações dos Jogos (Ajustadas com letras minúsculas padrão)
const { startJokenpo } = require('./games/jokenpo');
const { startVelha } = require('./games/velha');
const { startCidadeDorme } = require('./games/cidadeDorme');
const { startAkinator } = require('./games/akinator');
const { startMines } = require('./games/mines');
const { startBlackjack } = require('./games/blackjack');
const { startGenio } = require('./games/genio');

// Se o Render continuar reclamando do Bingo, certifique-se se no GitHub está 'bingo' ou 'Bingo'
const { startBingo } = require('./games/bingo'); 
// Se tiver os outros comandos criados pelo Copilot, remova as barras '//' abaixo:
// const { startTelefone } = require('./games/telefone');
// const { startAdedonha } = require('./games/adedonha');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const app = express();
app.get('/', (req, res) => res.send('Online!'));
app.listen(process.env.PORT || 3000);

// Sistema de gerenciamento de jogos desativados por Servidor (Guild)
const disabledGames = new Map();

const commands = [
  {
    name: 'jokenpo',
    description: 'Partida de Jokenpô. Jogue contra um amigo ou contra o Bot!',
    options: [{ name: 'oponente', type: 6, description: 'Deixe vazio para jogar contra o Bot.', required: false }]
  },
  {
    name: 'velha',
    description: 'Jogo da Velha. Jogue contra um amigo ou contra o Bot!',
    options: [{ name: 'oponente', type: 6, description: 'Deixe vazio para jogar contra o Bot.', required: false }]
  },
  { name: 'cidadedorme', description: 'Inicia uma partida temática de Cidade Dorme (Super Sus).' },
  { name: 'akinator', description: 'O gênio tenta adivinhar o seu personagem.' },
  { name: 'mines', description: 'Campo Minado valendo diamantes no chat.' },
  { name: 'blackjack', description: 'Jogue baralho 21 contra a banca.' },
  { name: 'genio', description: 'Teste sua memória repetindo as cores do gênio.' },
  { name: 'bingo', description: 'Inicia uma rodada de Bingo no chat.' },
  {
    name: 'togglegame',
    description: '[MODERADOR] Ativa ou desativa um jogo neste servidor.',
    default_member_permissions: '32', // Permissão de Gerenciar Servidor exigida
    options: [{
      name: 'jogo',
      type: 3,
      description: 'Qual jogo deseja ativar/desativar?',
      required: true,
      choices: [
        { name: 'Jokenpô', value: 'jokenpo' },
        { name: 'Jogo da Velha', value: 'velha' },
        { name: 'Cidade Dorme', value: 'cidadedorme' },
        { name: 'Akinator', value: 'akinator' },
        { name: 'Mines', value: 'mines' },
        { name: 'Blackjack', value: 'blackjack' },
        { name: 'Gênio', value: 'genio' },
        { name: 'Bingo', value: 'bingo' }
      ]
    }]
  }
];

client.once('ready', async () => {
  console.log(`Bot online: ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;
  const guildId = interaction.guildId;

  if (cmd === 'togglegame') {
    if (!disabledGames.has(guildId)) disabledGames.set(guildId, new Set());
    const serverGames = disabledGames.get(guildId);
    if (serverGames.has(jogo)) {
      serverGames.delete(jogo);
      return interaction.reply({ content: `✅ O jogo **${jogo}** foi **ATIVADO** neste servidor!`, ephemeral: true });
    } else {
      serverGames.add(jogo);
      return interaction.reply({ content: `🚫 O jogo **${jogo}** foi **DESATIVADO** neste servidor!`, ephemeral: true });
    }
  }

  if (disabledGames.get(guildId)?.has(cmd)) {
    return interaction.reply({ content: "❌ Este minigame foi desativado pelos moderadores neste servidor.", ephemeral: true });
  }

  if (cmd === 'jokenpo') await startJokenpo(interaction);
  if (cmd === 'velha') await startVelha(interaction);
  if (cmd === 'cidadedorme') await startCidadeDorme(interaction);
  if (cmd === 'akinator') await startAkinator(interaction);
  if (cmd === 'mines') await startMines(interaction);
  if (cmd === 'blackjack') await startBlackjack(interaction);
  if (cmd === 'genio') await startGenio(interaction);
  if (cmd === 'bingo') await startBingo(interaction);
});

client.login(process.env.TOKEN);
