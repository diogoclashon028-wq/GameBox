require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');

// Importações dos Jogos
const { startJokenpo } = require('./games/jokenpo');
const { startVelha } = require('./games/velha');
const { startCidadeDorme } = require('./games/cidadeDorme');
const { startAkinator } = require('./games/akinator');
const { startMines } = require('./games/mines');
const { startBlackjack } = require('./games/blackjack');
const { startGenio } = require('./games/genio');
const { startBingo } = require('./games/bingo');
const { startTelefone } = require('./games/telefoneSemFio');
const { startAdedonha } = require('./games/adedonha');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const app = express();
app.get('/', (req, res) => res.send('Online!'));
app.listen(process.env.PORT || 3000);

const commands = [
  {
    name: 'jokenpo',
    description: 'Partida de Jokenpô (Melhor de 3).',
    options: [{ name: 'oponente', type: 6, description: 'Quem você quer desafiar?', required: true }]
  },
  {
    name: 'velha',
    description: 'Jogo da Velha contra amigo ou Bot.',
    options: [{ name: 'oponente', type: 6, description: 'Seu oponente.', required: true }]
  },
  {
    name: 'cidadedorme',
    description: 'Inicia uma partida temática de Cidade Dorme (Super Sus).'
  },
  {
    name: 'akinator',
    description: 'O gênio tenta adivinhar o seu personagem.'
  },
  {
    name: 'mines',
    description: 'Campo Minado valendo diamantes no chat.'
  },
  {
    name: 'blackjack',
    description: 'Jogue baralho 21 contra a banca.'
  },
  {
    name: 'genio',
    description: 'Teste sua memória repetindo as cores do gênio.'
  },
  {
    name: 'bingo',
    description: 'Jogo de Bingo com sorteio automatizado de números.'
  },
  {
    name: 'telefone',
    description: 'Telefone Sem Fio - Veja como a mensagem muda passando de pessoa em pessoa.'
  },
  {
    name: 'adedonha',
    description: 'Adedonha/Stop - Jogo de palavras com letra sorteada.'
  }
];

client.once('ready', async () => {
  console.log(`Bot online: ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Todos os 10 minigames registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;

  if (cmd === 'jokenpo') await startJokenpo(interaction);
  if (cmd === 'velha') await startVelha(interaction);
  if (cmd === 'cidadedorme') await startCidadeDorme(interaction);
  if (cmd === 'akinator') await startAkinator(interaction);
  if (cmd === 'mines') await startMines(interaction);
  if (cmd === 'blackjack') await startBlackjack(interaction);
  if (cmd === 'genio') await startGenio(interaction);
  if (cmd === 'bingo') await startBingo(interaction);
  if (cmd === 'telefone') await startTelefone(interaction);
  if (cmd === 'adedonha') await startAdedonha(interaction);
});

client.login(process.env.TOKEN);
