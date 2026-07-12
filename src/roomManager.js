const activeRooms = new Map();

function createRoom(channelId, gameType, players) {
  activeRooms.set(channelId, { gameType, players });
}

function hasGame(channelId) {
  return activeRooms.has(channelId);
}

function destroyRoom(channelId) {
  activeRooms.delete(channelId);
}

module.exports = { createRoom, hasGame, destroyRoom };

