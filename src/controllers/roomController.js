// src/controllers/roomController.js
const photonService = require('../services/photonService');

const createRoom = async (req, res) => {
    const { maxPlayers = 4, roomName } = req.body;
    const hostId = req.user.uid;

    try {
        const result = await photonService.createRoom(hostId, maxPlayers, roomName);
        res.json({
            success: true,
            roomId: result.roomId,
            joinCode: result.roomId.substring(0, 6).toUpperCase(),
            region: result.region
        });
    } catch (err) {
        console.error('Create room error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const joinRoom = async (req, res) => {
    const { roomId } = req.params;
    const playerId = req.user.uid;

    try {
        const result = await photonService.joinRoom(roomId, playerId);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

const listRooms = async (req, res) => {
    try {
        const rooms = await photonService.listRooms();
        res.json({ success: true, rooms });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { createRoom, joinRoom, listRooms };