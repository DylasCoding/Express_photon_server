// src/controllers/roomController.js
const photonService = require('../services/photonService');

const createRoom = async (req, res) => {
    const { maxPlayers = 4, roomName } = req.body;
    const hostId = req.user.uid;

    try {
        const result = await photonService.createRoom(hostId, maxPlayers, roomName);

        // Lưu vào DB nếu cần
        // await RoomModel.create({ roomId: result.roomId, hostId, region: result.region });

        res.json({
            success: true,
            roomId: result.roomId,
            joinCode: result.roomId.substring(result.roomId.length - 6).toUpperCase(),
            region: result.region
        });

        await new Promise(resolve => setTimeout(resolve, 1000)); // Chờ 1 giây
        await photonService.safeCleanup();

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

const searchRoomByCode = async (req, res) => {
    const { joinCode } = req.body;

    if (!joinCode || joinCode.length < 4) {
        return res.status(400).json({ success: false, error: 'Invalid joinCode' });
    }

    try {
        const rooms = await photonService.listRooms(); // Bây giờ có hàm này!

        const found = rooms.find(room => {
            const code = room.name.substring(0, 6).toUpperCase();
            return code === joinCode.toUpperCase();
        });

        if (found) {
            res.json({
                success: true,
                room: {
                    roomId: found.name,
                    joinCode: found.name.substring(0, 6).toUpperCase(),
                    playerCount: found.playerCount || 0,
                    maxPlayers: found.maxPlayers || 4,
                    status: found.customRoomProperties?.status || 'unknown'
                }
            });
        } else {
            res.status(404).json({ success: false, error: 'Room not found' });
        }
    } catch (err) {
        console.error('Search room error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { createRoom, joinRoom, listRooms, searchRoomByCode };