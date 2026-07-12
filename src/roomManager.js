const activeRooms = new Map();

class RoomManager {
  hasGame(channelId) {
    return activeRooms.has(channelId);
  }

  createRoom(channelId, gameName, players) {
    activeRooms.set(channelId, {
      game: gameName,
      players: players,
      createdAt: Date.now()
    });
  }

  destroyRoom(channelId) {
    activeRooms.delete(channelId);
  }
}

module.exports = new RoomManager();
