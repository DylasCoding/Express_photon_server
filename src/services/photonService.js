// src/services/photonService.js
const { client, Photon, PHOTON_REGION } = require('../config/photon');

class PhotonService {
    constructor() {
        this.isConnected = false;
        this.pendingConnect = null;

        client.onStateChange = (state) => this._handleStateChange(state);
        client.onError = (error) => console.error('Photon Error:', error);
    }

    _handleStateChange(state) {
        console.log('Photon State:', Photon.LoadBalancing.LoadBalancingClient.StateToName(state));

        if (state === Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToMaster) {
            this.isConnected = true;
            if (this.pendingConnect) {
                this.pendingConnect.resolve();
                this.pendingConnect = null;
            }
        }

        if (state === Photon.LoadBalancing.LoadBalancingClient.State.Disconnected) {
            this.isConnected = false;
            if (this.pendingConnect) {
                this.pendingConnect.reject(new Error('Disconnected'));
            }
        }
    }

    async ensureConnected() {
        if (this.isConnected) return;

        return new Promise((resolve, reject) => {
            this.pendingConnect = { resolve, reject };
            client.connectToRegionMaster(PHOTON_REGION);
        });
    }

    async createRoom(hostId, maxPlayers = 4, roomName = null) {
        await this.ensureConnected();

        if (!roomName) {
            roomName = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Create room timeout'));
            }, 10000);

            client.onRoomListUpdate = () => {}; // ignore
            client.onJoinRoom = () => {
                clearTimeout(timeout);
                resolve({
                    roomId: client.myRoom().name,
                    region: PHOTON_REGION,
                    hostActorNr: client.myActor().actorNr
                });
                client.leaveRoom(); // Rời ngay để không giữ kết nối
            };

            const options = {
                maxPlayers,
                isVisible: true,
                isOpen: true,
                customRoomProperties: { hostId, status: 'waiting' },
                customRoomPropertiesForLobby: ['hostId', 'status']
            };

            client.createRoom(roomName, options);
        });
    }

    async joinRoom(roomId, playerId) {
        // Server không cần join, chỉ trả về OK
        return { success: true, roomId, message: 'Ready to join' };
    }

    async listRooms() {
        await this.ensureConnected();

        return new Promise((resolve) => {
            client.onRoomListUpdate = (rooms) => {
                resolve(rooms.map(r => ({
                    name: r.name,
                    playerCount: r.playerCount,
                    maxPlayers: r.maxPlayers,
                    customRoomProperties: r.customProperties
                })));
            };
            client.opGetRoomList(); // Lấy danh sách
        });
    }
}

module.exports = new PhotonService();