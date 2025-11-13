// src/controllers/roomController.js
const photonService = require('../services/photonService');

const createRoom = async (req, res) => {
    const { maxPlayers = 4 } = req.body;
    const hostId = req.user.uid;

    try {
        const result = await photonService.createRoom(hostId, maxPlayers);
        res.json({
            roomId: result.roomId,
            joinCode: result.roomId.substring(0, 6).toUpperCase() // Tạo code ngắn
        });
    } catch (err) {
        console.error('Create room error:', err);
        res.status(500).json({ error: err.message });
    }
};

const joinRoom = async (req, res) => {
    const { roomId } = req.params;
    const playerId = req.user.uid;

    try {
        const result = await photonService.joinRoom(roomId, playerId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = { createRoom, joinRoom };