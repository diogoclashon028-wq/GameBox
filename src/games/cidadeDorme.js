const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  StringSelectMenuBuilder, 
  ComponentType 
} = require('discord.js');
const roomManager = require('../roomManager');

async function startCidadeDorme(interaction) {
  const channelId = interaction.channelId;
  const host = interaction.user;

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Este chat já está ocupado por outro jogo.", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'cidadedorme', [host.id]);

  // Lista de funções disponíveis
  const rolesConfig = {
    mal: ['Dementador', 'Impostor', 'Apostador', 'Encrenqueira'],
    bem: ['Tripulante', 'Médico', 'Xerife', 'Detetive', 'Guardião'],
    neutro: ['Sobrevivente', 'Abelhinha', 'Traidor']
  };

  let players = [];
  let gameStarted = false;
  let phase = "inscrição"; // inscrição, noite, dia, votação
  let gameState = {
    alive: {}, // id: { user, role, side, shields: 0, disabled: false, abelhinhaTarget: null, killerSide: null }
    dead: {},
    nightActions: {},
    history: []
  };

  const embedSetup = new EmbedBuilder()
    .setTitle("🚀 Cidade Dorme: Especial Super Sus 🤫")
    .setDescription(`**Anfitrião:** <@${host.id}>\n\nClique no botão abaixo para entrar na nave! São necessários no mínimo 4 jogadores.`)
    .setColor("#E74C3C")
    .setFooter({ text: "Apenas o Anfitrião pode iniciar o jogo." });

  const rowSetup = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cd_entrar').setLabel('Entrar na Nave 🧑‍🚀').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cd_iniciar').setLabel('Iniciar Jogo 🚀').setStyle(ButtonStyle.Success)
  );

  const response = await interaction.reply({ embeds: [embedSetup], components: [rowSetup], fetchReply: true });

  const collector = response.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async i => {
    // ---- INSCRIÇÃO ----
    if (i.customId === 'cd_entrar') {
      if (gameStarted) return i.reply({ content: "❌ O jogo já começou!", ephemeral: true });
      if (players.some(p => p.id === i.user.id)) return i.reply({ content: "❌ Você já está na nave!", ephemeral: true });
      
      players.push(i.user);
      embedSetup.setDescription(`**Anfitrião:** <@${host.id}>\n\n**Tripulação Atual (${players.length}):**\n${players.map(p => `• <@${p.id}>`).join('\n')}`);
      await i.update({ embeds: [embedSetup] });
    }

    if (i.customId === 'cd_iniciar') {
      if (i.user.id !== host.id) return i.reply({ content: "❌ Apenas o anfitrião pode iniciar o jogo!", ephemeral: true });
      if (players.length < 4) return i.reply({ content: "❌ São necessários pelo menos 4 jogadores para iniciar.", ephemeral: true });
      
      gameStarted = true;
      distributeRoles();
      await enviarFuncoesPrivadas();
      await iniciarNoite(interaction);
    }

    // ---- AÇÕES DA NOITE E VOTAÇÃO ----
    if (i.isStringSelectMenu()) {
      if (!gameState.alive[i.user.id]) return i.reply({ content: "👻 Mortos não jogam!", ephemeral: true });

      if (phase === "noite") {
        const pData = gameState.alive[i.user.id];
        if (pData.disabled) {
          return i.reply({ content: "❌ Você foi bloqueado pela Encrenqueira nesta noite!", ephemeral: true });
        }

        const targetId = i.values[0];
        gameState.nightActions[i.user.id] = targetId;
        await i.reply({ content: `✅ Sua ação foi registrada em segredo!`, ephemeral: true });
      }

      if (phase === "votação") {
        // Lógica de Votos
        const targetId = i.values[0];
        gameState.votes[i.user.id] = targetId;
        await i.reply({ content: "✅ Seu voto foi computado!", ephemeral: true });
      }
    }
  });

  // ---- DISTRIBUIÇÃO DE FUNÇÕES ----
  function distributeRoles() {
    let pool = [];
    const total = players.length;

    if (total <= 10) {
      // Mistura funções sem repetir (exceto tripulante se faltar)
      let allRoles = [
        ...rolesConfig.mal.map(r => ({ name: r, side: 'mal' })),
        ...rolesConfig.bem.map(r => ({ name: r, side: 'bem' })),
        ...rolesConfig.neutro.map(r => ({ name: r, side: 'neutro' }))
      ];
      allRoles.sort(() => Math.random() - 0.5);
      pool = allRoles.slice(0, total);
      
      // Garante pelo menos 1 do mal e 1 do bem
      if (!pool.some(r => r.side === 'mal')) pool[0] = { name: 'Impostor', side: 'mal' };
      if (!pool.some(r => r.side === 'bem')) pool[1] = { name: 'Tripulante', side: 'bem' };
    } else {
      // Mais de 10 jogadores: permite repetições totais
      for (let i = 0; i < total; i++) {
        const types = ['mal', 'bem', 'neutro'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const list = rolesConfig[chosenType];
        const name = list[Math.floor(Math.random() * list.length)];
        pool.push({ name, side: chosenType });
      }
    }

    players.forEach((p, idx) => {
      const roleInfo = pool[idx];
      gameState.alive[p.id] = {
        user: p,
        role: roleInfo.name,
        side: roleInfo.side,
        shields: roleInfo.name === 'Sobrevivente' ? 2 : 0,
        disabled: false,
        abelhinhaTarget: null,
        killerSide: null,
        charges: roleInfo.name === 'Encrenqueira' ? 3 : roleInfo.name === 'Dementador' ? 2 : 0
      };
    });
  }

  async function enviarFuncoesPrivadas() {
    for (const id in gameState.alive) {
      const p = gameState.alive[id];
      try {
        await p.user.send(`🕵️‍♂️ Sua função secreta no Super Sus é: **${p.role}** (${p.side.toUpperCase()})\nFique atento aos comandos no chat do servidor!`);
      } catch (e) {
        console.log(`Não consegui mandar DM para ${p.user.tag}`);
      }
    }
  }

  // ---- CICLO DE NOITE ----
  async function iniciarNoite(inter) {
    phase = "noite";
    gameState.nightActions = {};

    // Limpa bloqueios anteriores
    for (const id in gameState.alive) gameState.alive[id].disabled = false;

    const embedNoite = new EmbedBuilder()
      .setTitle("🌑 A Noite Chegou... A Cidade Dorme!")
      .setDescription("Invasores e Neutros agem nas sombras. Verifique suas opções no menu abaixo caso tenha uma função ativa!")
      .setColor("#2C3E50");

    // Menu com alvos vivos
    const options = Object.values(gameState.alive).map(p => ({
      label: p.user.username,
      value: p.user.id
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId('cd_acao_noite')
      .setPlaceholder('Escolha seu alvo da noite...')
      .addComponents(options);

    const row = new ActionRowBuilder().addComponents(menu);

    await inter.editReply({ embeds: [embedNoite], components: [row] });

    // 30 segundos para a noite acabar
    setTimeout(() => processarNoite(inter), 30000);
  }

  // ---- PROCESSAR AÇÕES DA NOITE ----
  async function processarNoite(inter) {
    let mortosDaNoite = new Set();
    let protegidos = new Set();
    let revividos = new Set();
    let logsTurno = [];

    // 1. Encrenqueira age primeiro bloqueando habilidades
    for (const id in gameState.nightActions) {
      const p = gameState.alive[id];
      if (p?.role === 'Encrenqueira' && p.charges > 0) {
        const targetId = gameState.nightActions[id];
        if (gameState.alive[targetId]) {
          gameState.alive[targetId].disabled = true;
          p.charges--;
        }
      }
    }

    // 2. Guardião protege
    for (const id in gameState.nightActions) {
      const p = gameState.alive[id];
      if (p?.role === 'Guardião' && !p.disabled) {
        const targetId = gameState.nightActions[id];
        protegidos.add(targetId);
      }
    }

    // 3. Ataques e Investigações
    for (const id in gameState.nightActions) {
      const p = gameState.alive[id];
      if (p?.disabled) continue;

      const targetId = gameState.nightActions[id];
      const target = gameState.alive[targetId];

      if (!target) continue;

      // Ataques normais (Impostor, Dementador, Traidor)
      if (p.role === 'Impostor' || p.role === 'Dementador' || (p.role === 'Traidor' && p.killerSide === 'mal')) {
        if (!protegidos.has(targetId)) {
          if (target.shields > 0) {
            target.shields--;
          } else {
            mortosDaNoite.add(targetId);
          }
        }
      }

      // Apostador
      if (p.role === 'Apostador') {
        // Para simplificar via bot móvel, ele chuta um papel aleatório ou mata se o alvo for oposto
        if (target.side !== p.side && !protegidos.has(targetId)) {
          mortosDaNoite.add(targetId);
        } else {
          mortosDaNoite.add(id); // Ele errou e morre
        }
      }

      // Xerife
      if (p.role === 'Xerife') {
        if (target.side === 'mal') {
          mortosDaNoite.add(targetId);
        } else if (target.side === 'bem') {
          mortosDaNoite.add(id); // Xerife errou e se mata
        }
      }

      // Detetive
      if (p.role === 'Detetive') {
        logsTurno.push(`🔍 O Detetive investigou alguém e descobriu que pertence ao lado: **${target.side.toUpperCase()}**`);
      }

      // Abelhinha
      if (p.role === 'Abelhinha') {
        p.abelhinhaTarget = targetId;
      }
    }

    // 4. Médico revive um aleatório dos mortos daquela noite
    for (const id in gameState.nightActions) {
      const p = gameState.alive[id];
      if (p?.role === 'Médico' && !p.disabled && mortosDaNoite.size > 0) {
        const listaMortos = Array.from(mortosDaNoite);
        const escolhido = listaMortos[Math.floor(Math.random() * listaMortos.length)];
        mortosDaNoite.delete(escolhido);
        revividos.add(escolhido);
      }
    }

    // Aplicar as mortes no estado global
    for (const mId of mortosDaNoite) {
      gameState.dead[mId] = gameState.alive[mId];
      delete gameState.alive[mId];
    }

    // ---- FASE DO DIA ----
    phase = "dia";
    let textoDia = "🌞 O Sol nasceu na nave!\n\n";
    if (mortosDaNoite.size === 0) {
      textoDia += "🕊️ Impressionante! Ninguém morreu esta noite.";
    } else {
      textoDia += `💀 **Vítimas da Noite:**\n${Array.from(mortosDaNoite).map(mId => `• <@${mId}>`).join('\n')}`;
    }

    if (logsTurno.length > 0) {
      textoDia += `\n\n**Notas do Detetive:**\n${logsTurno.join('\n')}`;
    }

    const embedDia = new EmbedBuilder()
      .setTitle("📢 Reunião de Emergência / Discussão")
      .setDescription(textoDia)
      .setColor("#F1C40F");

    await inter.editReply({ embeds: [embedDia], components: [] });

    if (verificarFimDeJogo(inter)) return;

    // Aguarda 25 segundos de discussão e abre votação
    setTimeout(() => iniciarVotacao(inter), 25000);
  }

  // ---- FASE DE VOTAÇÃO ----
  async function iniciarVotacao(inter) {
    phase = "votação";
    gameState.votes = {};

    const embedVoto = new EmbedBuilder()
      .setTitle("🗳️ Hora de Votar!")
      .setDescription("Escolha quem você deseja ejetar da nave através do menu abaixo.")
      .setColor("#E67E22");

    const options = Object.values(gameState.alive).map(p => ({
      label: p.user.username,
      value: p.user.id
    }));
    options.push({ label: "Pular Voto (Skip)", value: "skip" });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('cd_voto')
      .setPlaceholder('Escolha seu voto...')
      .addComponents(options);

    await inter.editReply({ embeds: [embedVoto], components: [new ActionRowBuilder().addComponents(menu)] });

    setTimeout(() => contabilizarVotos(inter), 25000);
  }

  async function contabilizarVotos(inter) {
    let contagem = {};
    for (const vitor em Object.values(gameState.votes)) {
      contagem[vitor] = (contagem[vitor] || 0) + 1;
    }

    let maisVotado = null;
    let maxVotos = 0;
    let empate = false;

    for (const alvo in contagem) {
      if (alvo === 'skip') continue;
      if (contagem[alvo] > maxVotos) {
        maxVotos = contagem[alvo];
        maisVotado = alvo;
        empate = false;
      } else if (contagem[alvo] === maxVotos) {
        empate = true;
      }
    }

    let tResultado = "";
    if (empate || !maisVotado || contagem['skip'] >= maxVotos) {
      tResultado = "❌ A votação ficou empatada ou a maioria pulou! Ninguém foi ejetado.";
    } else {
      const ejetado = gameState.alive[maisVotado];
      tResultado = `🚀 <@${maisVotado}> recebeu a maioria dos votos e foi ejetado! Eles eram: **${ejetado.role}**`;
      gameState.dead[maisVotado] = ejetado;
      delete gameState.alive[maisVotado];
    }

    const embedRes = new EmbedBuilder()
      .setTitle("📊 Resultado da Votação")
      .setDescription(tResultado)
      .setColor("#95A5A6");

    await inter.editReply({ embeds: [embedRes], components: [] });

    if (verificarFimDeJogo(inter)) return;

    setTimeout(() => iniciarNoite(inter), 10000);
  }

  // ---- VERIFICAÇÃO DE VITÓRIA ----
  function verificarFimDeJogo(inter) {
    const vivos = Object.values(gameState.alive);
    const mAlvo = vivos.filter(p => p.side === 'mal').length;
    const bAlvo = vivos.filter(p => p.side === 'bem').length;

    let finalEmbed = null;

    if (mAlvo === 0) {
      finalEmbed = new EmbedBuilder()
        .setTitle("🎉 VITÓRIA DA TRIPULAÇÃO (BEM)!")
        .setDescription("Todos os impostores e dementadores foram eliminados!")
        .setColor("#2ECC71");
    } else if (mAlvo >= bAlvo) {
      finalEmbed = new EmbedBuilder()
        .setTitle("😈 VITÓRIA DOS IMPOSTORES (MAL)!")
        .setDescription("O mal dominou a nave por completo!")
        .setColor("#E74C3C");
    }

    if (finalEmbed) {
      inter.editReply({ embeds: [finalEmbed], components: [] });
      collector.stop();
      roomManager.destroyRoom(channelId);
      return true;
    }
    return false;
  }

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startCidadeDorme };
          
