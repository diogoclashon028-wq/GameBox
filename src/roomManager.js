const activeRooms = new Map();

class RoomManager {
  // Verifica se o canal já tem um jogo rodando
  hasGame(channelId) {
    return activeRooms.has(channelId);
  }

  // Cria uma nova janela de jogo no canal
  createRoom(channelId, gameName, players) {
    activeRooms.set(channelId, {
      game: gameName,
      players: players,
      createdAt: Date.now()
    });
  }

  // Finaliza o jogo e libera o canal para novas janelas
  destroyRoom(channelId) {
    activeRooms.delete(channelId);
  }
}

module.exports = new RoomManager();

