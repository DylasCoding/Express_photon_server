const photonService = require('../services/photonService');

const createRoom = async (req, res) => {
    const { maxPlayers } = req.body;
    const hostId = req.user.uid;

    try {
        const room = await photonService.createRoom(hostId, maxPlayers);
        res.json({ roomId: room.roomId, joinCode: room.joinCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const joinRoom = async (req, res) => {
    const { roomId } = req.params;
    const playerId = req.user.uid;

    try {
        const result = await photonService.joinRoom(roomId, playerId);
        res.json({ success: true, actorNr: result.actorNr });
    } catch (err) {
        res.status(400).json({ error: 'Cannot join room' });
    }
};

module.exports = { createRoom, joinRoom };