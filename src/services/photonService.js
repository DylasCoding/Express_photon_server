// src/services/photonService.js
const axios = require('axios');
const { APP_ID, SECRET_KEY, MANAGEMENT_API } = require('../config/photon');

class PhotonService {
    async createRoom(hostId, maxPlayers = 4, roomName = null) {
        if (!roomName) {
            roomName = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }

        try {
            const response = await axios.post(
                `${MANAGEMENT_API}/v2/applications/${APP_ID}/rooms`,
                {
                    name: roomName,
                    maxPlayers,
                    isVisible: true,
                    isOpen: true,
                    customRoomProperties: {
                        hostId,
                        status: "waiting"
                    }
                },
                {
                    headers: {
                        'Auth-Token': SECRET_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                roomId: response.data.name,
                region: 'asia', // Unity sẽ connect region này
                hostActorNr: 1
            };
        } catch (error) {
            console.error('Photon createRoom error:', error.response?.data || error.message);
            throw new Error(`Tạo room thất bại: ${error.response?.data?.message || error.message}`);
        }
    }

    async joinRoom(roomId, playerId) {
        // Server KHÔNG cần join room (chỉ tạo + quản lý)
        // Unity client tự join qua Photon Realtime
        return {
            success: true,
            message: `Đã sẵn sàng join room ${roomId}`,
            roomId
        };
    }

    async listRooms() {
        try {
            const response = await axios.get(
                `${MANAGEMENT_API}/v2/applications/${APP_ID}/rooms`,
                { headers: { 'Auth-Token': SECRET_KEY } }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Lấy danh sách room thất bại: ${error.message}`);
        }
    }
}

module.exports = new PhotonService();