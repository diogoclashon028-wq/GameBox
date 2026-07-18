// Map para guardar o estado dos canais/salas ocupadas
const activeRooms = new Map();

module.exports = {
  /**
   * Verifica se já existe um jogo rodando no canal
   * @param {string} channelId 
   * @returns {boolean}
   */
  hasGame(channelId) {
    return activeRooms.has(channelId);
  },

  /**
   * Cria uma nova sala de jogo no canal
   * @param {string} channelId 
   * @param {string} gameName 
   * @param {string[]} players 
   */
  createRoom(channelId, gameName, players) {
    activeRooms.set(channelId, {
      game: gameName,
      players: players,
      createdAt: Date.now()
    });
  },

  /**
   * Destrói/Libera a sala do canal para novos jogos
   * @param {string} channelId 
   * @returns {boolean}
   */
  destroyRoom(channelId) {
    return activeRooms.delete(channelId);
  }
};
