// src/services/photonService.js
const { client, Photon, PHOTON_REGION } = require('../config/photon');
const logger = require('../utils/logger');

class PhotonService {
    constructor() {
        this.isConnected = false;
        this.pendingConnect = null;
        this.reconnectAttempts = 0;
        this.maxReconnects = 3;

        client.onStateChange = (state) => this._handleStateChange(state);
        client.onError = (error) => {
            console.error('Photon Error:', error);
            this.isConnected = false;
        };
    }

    _handleStateChange(state) {
        const stateName = Photon.LoadBalancing.LoadBalancingClient.StateToName(state);
        console.log('Photon State:', stateName);

        switch (state) {
            case Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToMaster:
                this.isConnected = true;
                this.reconnectAttempts = 0; // Reset
                if (this.pendingConnect) {
                    this.pendingConnect.resolve();
                    this.pendingConnect = null;
                }
                break;

            case Photon.LoadBalancing.LoadBalancingClient.State.Disconnected:
            case Photon.LoadBalancing.LoadBalancingClient.State.Error:
                this.isConnected = false;
                if (this.pendingConnect) {
                    this.pendingConnect.reject(new Error(`Photon disconnected: ${stateName}`));
                    this.pendingConnect = null;
                }
                break;
        }
    }

    async ensureConnected() {
        // Nếu đã kết nối, thoát luôn
        if (client.state === Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToMaster) {
            this.isConnected = true;
            return;
        }

        // Tránh việc gọi connect nhiều lần khi đang đợi
        if (this.pendingConnect) return this.pendingConnect.promise;

        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        this.pendingConnect = { promise, resolve, reject };

        const timeout = setTimeout(() => {
            if (this.pendingConnect) {
                this.pendingConnect.reject(new Error('Connect timeout'));
                this.pendingConnect = null;
            }
        }, 15000); // Tăng lên 15s cho môi trường cloud

        try {
            client.connectToRegionMaster(PHOTON_REGION);
        } catch (e) {
            reject(e);
        }

        return promise;
    }

    async createRoom(hostId, maxPlayers = 4, roomName = null) {
        if (!this.isConnected) {
            console.log('[Photon] Connecting...');
            await this.ensureConnected();
        }

        if (!roomName) {
            roomName = `r${Date.now() % 100000}_${Math.floor(Math.random() * 1000)}`;
        }

        console.log(`[Photon] Creating room: ${roomName} (max: ${maxPlayers})`);

        console.log('[DEBUG] Photon State:', Photon.LoadBalancing.LoadBalancingClient.StateToName(client.state));
        console.log('[DEBUG] In Lobby:', client.isInLobby());
        console.log('[DEBUG] In Room:', client.isJoinedToRoom());
        console.log('[DEBUG] Room Name:', client.myRoom()?.name || 'NONE');
        console.log('[DEBUG] Actor Nr:', client.myActor()?.actorNr || 'NONE');
        // console.log('[DEBUG] Room Actors:', client.myRoom()?.getActorCount?.() || 0);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.log(`[DEBUG 10s] Still in room? ${client.myRoom()?.name || 'DISCONNECTED'}`);
                console.error('[Photon] Create room TIMEOUT');
                cleanup();
                reject(new Error('Create room timeout'));
            }, 15000);

            // LƯU LẠI onError GỐC
            const originalOnError = client.onError;

            // Listener tạm: khi JOIN ROOM (tức là tạo thành công)
            const onJoinRoom = () => {
                const room = client.myRoom();
                if (!room || room.name !== roomName) return; // Không phải phòng mình

                clearTimeout(timeout);
                cleanup();

                console.log(`[Photon] Room CREATED & JOINED: ${room.name} | Actor: ${client.myActor()?.actorNr}`);

                resolve({
                    roomId: room.name,
                    region: PHOTON_REGION
                });

                // client.leaveRoom(room.id); // Rời phòng sau khi tạo xong
                // client.disconnect();
            };

            // Gán listener
            client.onJoinRoom = onJoinRoom;

            // Xử lý lỗi
            client.onError = (err) => {
                clearTimeout(timeout);
                cleanup();
                console.error(`[Photon] CREATE FAILED: ${err.errorMessage || err}`);
                reject(new Error(err.errorMessage || 'Photon error'));
            };

            // Hàm dọn dẹp
            const cleanup = () => {
                client.onJoinRoom = null;
                client.onError = originalOnError;
            };

            const options = {
                maxPlayers,
                IsPersistent: true,
                isVisible: true,
                isOpen: true,
                customRoomProperties: {
                    hostId,
                    status: 'waiting',
                    name: roomName
                },
                customRoomPropertiesForLobby: ['hostId', 'status', 'name'],
                EmptyRoomTtl: 300000,  // 5 phút
                PlayerTtl: 60000       // 60s
            };

            // GỌI TẠO PHÒNG
            client.createRoom(roomName, options);
        });
    }

    async joinRoom(roomId, playerId) {
        if (!this.isConnected) await this.ensureConnected();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Join timeout')), 10000);

            client.onJoinRoom = () => {
                clearTimeout(timeout);
                resolve({ success: true, roomId });
                client.onJoinRoom = null;
            };

            client.onError = (err) => {
                clearTimeout(timeout);
                reject(err);
            };

            client.joinRoom(roomId);
        });
    }

    async safeCleanup() {
        if (client.isJoinedToRoom()) {
            console.log('[Photon] Cleanup: Leaving room...');
            // Rời phòng
            client.leaveRoom();
        }

        // Chờ 0.5s để Photon xử lý lệnh leaveRoom
        await new Promise(resolve => setTimeout(resolve, 500));

        if (this.isConnected) {
            console.log('[Photon] Cleanup: Disconnecting client...');
            // Ngắt kết nối
            client.disconnect();
        }

        this.isConnected = false;
        // Bỏ qua logic reconnecting/reconnectAttempts
    }
}

module.exports = new PhotonService();