require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
const { startJokenpo } = require('./games/jokenpo');
const { startVelha } = require('./games/velha');
const { startCidadeDorme } = require('./games/cidadeDorme'); // NOVO

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const app = express();
app.get('/', (req, res) => res.send('Online!'));
app.listen(process.env.PORT || 3000);

const commands = [
  {
    name: 'jokenpo',
    description: 'Desafie um amigo para uma partida de Jokenpô (Melhor de 3).',
    options: [{ name: 'oponente', type: 6, description: 'Quem você quer desafiar?', required: true }]
  },
  {
    name: 'velha',
    description: 'Jogue Jogo da Velha contra um amigo ou escolha o Bot.',
    options: [{ name: 'oponente', type: 6, description: 'Escolha um amigo ou o próprio Bot para jogar solo.', required: true }]
  },
  {
    name: 'cidadedorme',
    description: 'Inicia uma partida temática de Cidade Dorme (Super Sus).'
  }
];

client.once('ready', async () => {
  console.log(`Bot online: ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Todos os comandos registrados!');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'jokenpo') await startJokenpo(interaction);
  if (interaction.commandName === 'velha') await startVelha(interaction);
  if (interaction.commandName === 'cidadedorme') await startCidadeDorme(interaction); // NOVO
});

client.login(process.env.TOKEN);
