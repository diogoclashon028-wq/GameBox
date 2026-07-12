require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const express = require('express');
const { startJokenpo } = require('./games/jokenpo');
const { startVelha } = require('./games/velha');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// 🚪 Servidor Web para o Render (Evita o bot dormir)
const app = express();
app.get('/', (req, res) => res.send('Bot de Minigames Online! 🎮'));
app.listen(process.env.PORT || 3000, () => console.log('Servidor HTTP Ativo.'));

// ⚡ Registro de Comandos Slash
const commands = [
  {
    name: 'jokenpo',
    description: 'Abre uma janela de Jokenpô contra o bot.'
  },
  {
    name: 'velha',
    description: 'Desafie alguém para um jogo da velha.',
    options: [
      {
        name: 'oponente',
        type: ApplicationCommandOptionType.User,
        description: 'Quem você quer desafiar?',
        required: true
      }
    ]
  }
];

client.once('ready', async () => {
  console.log(`Logado como ${client.user.tag}!`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Comandos registrados com sucesso globalmente!');
  } catch (error) {
    console.error(error);
  }
});

// 🎮 Ouvinte de Interações
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'jokenpo') {
    await startJokenpo(interaction);
  }
  if (interaction.commandName === 'velha') {
    await startVelha(interaction);
  }
});

client.login(process.env.TOKEN);

