const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const roomManager = require('../roommanager.js'); // Caminho corrigido

async function startCidadeDorme(interaction) {
  const channelId = interaction.channelId;
  const host = interaction.user;

  if (roomManager.hasGame(channelId)) {
    return interaction.reply({ content: "❌ Este chat já está ocupado por outro jogo.", ephemeral: true });
  }

  roomManager.createRoom(channelId, 'cidadedorme', [host.id]);

  const rolesConfig = {
    mal: ['Dementador', 'Impostor', 'Apostador', 'Encrenqueira'],
    bem: ['Tripulante', 'Médico', 'Xerife', 'Detetive', 'Guardião'],
    neutro: ['Sobrevivente', 'Abelhinha', 'Traidor']
  };

  let players = [];
  let gameStarted = false;
  let phase = "inscrição";
  let gameState = { alive: {}, dead: {}, nightActions: {}, history: [] };

  const embedSetup = new EmbedBuilder()
    .setTitle("🚀 Cidade Dorme: Especial Super Sus 🤫")
    .setDescription(`**Anfitrião:** <@${host.id}>\n\nClique no botão abaixo para entrar na nave! Mínimo de 4 jogadores.`)
    .setColor("#E74C3C");

  const rowSetup = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cd_entrar').setLabel('Entrar na Nave 🧑‍🚀').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cd_iniciar').setLabel('Iniciar Jogo 🚀').setStyle(ButtonStyle.Success)
  );

  const response = await interaction.reply({ embeds: [embedSetup], components: [rowSetup], fetchReply: true });
  const collector = response.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async i => {
    if (i.customId === 'cd_entrar') {
      if (gameStarted) return i.reply({ content: "❌ O jogo já começou!", ephemeral: true });
      if (players.some(p => p.id === i.user.id)) return i.reply({ content: "❌ Você já está na nave!", ephemeral: true });
      
      players.push(i.user);
      embedSetup.setDescription(`**Anfitrião:** <@${host.id}>\n\n**Tripulação Atual (${players.length}):**\n${players.map(p => `• <@${p.id}>`).join('\n')}`);
      await i.update({ embeds: [embedSetup] });
    }

    if (i.customId === 'cd_iniciar') {
      if (i.user.id !== host.id) return i.reply({ content: "❌ Apenas o anfitrião pode iniciar!", ephemeral: true });
      if (players.length < 4) return i.reply({ content: "❌ Mínimo de 4 jogadores.", ephemeral: true });
      
      gameStarted = true;
      distributeRoles();
      await enviarFuncoesPrivadas();
      await iniciarNoite(interaction);
    }

    if (i.isStringSelectMenu()) {
      if (!gameState.alive[i.user.id]) return i.reply({ content: "👻 Mortos não jogam!", ephemeral: true });

      if (phase === "noite") {
        if (gameState.alive[i.user.id].disabled) return i.reply({ content: "❌ Você foi bloqueado pela Encrenqueira!", ephemeral: true });
        gameState.nightActions[i.user.id] = i.values[0];
        await i.reply({ content: `✅ Ação salva em segredo!`, ephemeral: true });
      }

      if (phase === "votação") {
        gameState.votes[i.user.id] = i.values[0];
        await i.reply({ content: "✅ Seu voto foi computado!", ephemeral: true });
      }
    }
  });

  function distributeRoles() {
    let pool = [];
    const total = players.length;

    if (total <= 10) {
      let allRoles = [
        ...rolesConfig.mal.map(r => ({ name: r, side: 'mal' })),
        ...rolesConfig.bem.map(r => ({ name: r, side: 'bem' })),
        ...rolesConfig.neutro.map(r => ({ name: r, side: 'neutro' }))
      ];
      allRoles.sort(() => Math.random() - 0.5);
      pool = allRoles.slice(0, total);
      if (!pool.some(r => r.side === 'mal')) pool[0] = { name: 'Impostor', side: 'mal' };
      if (!pool.some(r => r.side === 'bem')) pool[1] = { name: 'Tripulante', side: 'bem' };
    } else {
      for (let i = 0; i < total; i++) {
        const types = ['mal', 'bem', 'neutro'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        pool.push({ name: rolesConfig[chosenType][Math.floor(Math.random() * rolesConfig[chosenType].length)], side: chosenType });
      }
    }

    players.forEach((p, idx) => {
      gameState.alive[p.id] = {
        user: p, role: pool[idx].name, side: pool[idx].side,
        shields: pool[idx].name === 'Sobrevivente' ? 2 : 0,
        disabled: false, abelhinhaTarget: null, killerSide: null,
        charges: pool[idx].name === 'Encrenqueira' ? 3 : pool[idx].name === 'Dementador' ? 2 : 0
      };
    });
  }

  async function enviarFuncoesPrivadas() {
    for (const id in gameState.alive) {
      try { await gameState.alive[id].user.send(`🕵️‍♂️ Sua função: **${gameState.alive[id].role}** (${gameState.alive[id].side.toUpperCase()})`); } catch (e) {}
    }
  }

  async function iniciarNoite(inter) {
    phase = "noite";
    gameState.nightActions = {};
    for (const id in gameState.alive) gameState.alive[id].disabled = false;

    const options = Object.values(gameState.alive).map(p => ({ label: p.user.username, value: p.user.id }));
    const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('cd_acao_noite').setPlaceholder('Escolha seu alvo...').addComponents(options));

    await inter.editReply({ embeds: [new EmbedBuilder().setTitle("🌑 A Noite Chegou!").setDescription("Usem seus poderes no menu abaixo.").setColor("#2C3E50")], components: [row] });
    setTimeout(() => processarNoite(inter), 30000);
  }

  async function processarNoite(inter) {
    let mortosDaNoite = new Set();
    let protegidos = new Set();
    let logsTurno = [];

    for (const id in gameState.nightActions) {
      const p = gameState.alive[id];
      if (p?.role === 'Encrenqueira' && p.charges > 0) {
        if (gameState.alive[gameState.nightActions[id]]) { gameState.alive[gameState.nightActions[id]].disabled = true; p.charges--; }
      }
    }

    for (const id in gameState.nightActions) {
      if (gameState.alive[id]?.role === 'Guardião' && !gameState.alive[id].disabled) protegidos.add(gameState.nightActions[id]);
    }

    for (const id in gameState.nightActions) {
      const p = gameState.alive[id];
      if (p?.disabled) continue;
      const targetId = gameState.nightActions[id];
      const target = gameState.alive[targetId];
      if (!target) continue;

      if (p.role === 'Impostor' || p.role === 'Dementador') {
        if (!protegidos.has(targetId)) { if (target.shields > 0) target.shields--; else mortosDaNoite.add(targetId); }
      }
      if (p.role === 'Apostador') {
        if (target.side !== p.side && !protegidos.has(targetId)) mortosDaNoite.add(targetId); else mortosDaNoite.add(id);
      }
      if (p.role === 'Xerife') {
        if (target.side === 'mal') mortosDaNoite.add(targetId); else if (target.side === 'bem') mortosDaNoite.add(id);
      }
      if (p.role === 'Detetive') logsTurno.push(`🔍 Detetive investigou alguém e descobriu o lado: **${target.side.toUpperCase()}**`);
    }

    for (const mId of mortosDaNoite) { gameState.dead[mId] = gameState.alive[mId]; delete gameState.alive[mId]; }

    phase = "dia";
    let textoDia = mortosDaNoite.size === 0 ? "🕊️ Ninguém morreu esta noite." : `💀 **Mortos da Noite:**\n${Array.from(mortosDaNoite).map(mId => `• <@${mId}>`).join('\n')}`;
    if (logsTurno.length > 0) textoDia += `\n\n${logsTurno.join('\n')}`;

    await inter.editReply({ embeds: [new EmbedBuilder().setTitle("📢 Amanheceu!").setDescription(textoDia).setColor("#F1C40F")], components: [] });
    if (verificarFimDeJogo(inter)) return;
    setTimeout(() => iniciarVotacao(inter), 25000);
  }

  async function iniciarVotacao(inter) {
    phase = "votação";
    gameState.votes = {};
    const options = Object.values(gameState.alive).map(p => ({ label: p.user.username, value: p.user.id }));
    options.push({ label: "Pular Voto (Skip)", value: "skip" });

    await inter.editReply({ embeds: [new EmbedBuilder().setTitle("🗳️ Hora de Votar!").setColor("#E67E22")], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('cd_voto').addComponents(options))] });
    setTimeout(() => contabilizarVotos(inter), 25000);
  }

  async function contabilizarVotos(inter) {
    let contagem = {};
    for (const v of Object.values(gameState.votes)) contagem[v] = (contagem[v] || 0) + 1;
    let maisVotado = null, maxVotos = 0, empate = false;

    for (const alvo in contagem) {
      if (alvo === 'skip') continue;
      if (contagem[alvo] > maxVotos) { maxVotos = contagem[alvo]; maisVotado = alvo; empate = false; }
      else if (contagem[alvo] === maxVotos) empate = true;
    }

    let resText = (empate || !maisVotado || contagem['skip'] >= maxVotos) ? "❌ Ninguém foi ejetado." : `🚀 <@${maisVotado}> foi ejetado! Era: **${gameState.alive[maisVotado].role}**`;
    if (!empate && maisVotado && contagem['skip'] < maxVotos) { gameState.dead[maisVotado] = gameState.alive[maisVotado]; delete gameState.alive[maisVotado]; }

    await inter.editReply({ embeds: [new EmbedBuilder().setTitle("📊 Resultado").setDescription(resText).setColor("#95A5A6")], components: [] });
    if (verificarFimDeJogo(inter)) return;
    setTimeout(() => iniciarNoite(inter), 10000);
  }

  function verificarFimDeJogo(inter) {
    const vivos = Object.values(gameState.alive);
    const mAlvo = vivos.filter(p => p.side === 'mal').length;
    const bAlvo = vivos.filter(p => p.side === 'bem').length;

    let finalEmbed = null;
    if (mAlvo === 0) finalEmbed = new EmbedBuilder().setTitle("🎉 VITÓRIA DA TRIPULAÇÃO!").setColor("#2ECC71");
    else if (mAlvo >= bAlvo) finalEmbed = new EmbedBuilder().setTitle("😈 VITÓRIA DOS IMPOSTORES!").setColor("#E74C3C");

    if (finalEmbed) { inter.editReply({ embeds: [finalEmbed], components: [] }); collector.stop(); roomManager.destroyRoom(channelId); return true; }
    return false;
  }

  collector.on('end', () => roomManager.destroyRoom(channelId));
}

module.exports = { startCidadeDorme };
