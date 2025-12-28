// src/services/photonService.js
const { client, Photon, PHOTON_REGION } = require('../config/photon');
const { Mutex } = require('async-mutex');

class PhotonService {
    constructor() {
        this.isConnected = false;
        this.pendingConnect = null;
        this.createRoomMutex = new Mutex(); // Khởi tạo Mutex để khóa luồng tạo phòng

        client.onStateChange = (state) => this._handleStateChange(state);
        client.onError = (error) => {
            console.error('Photon Error:', error);
            this.isConnected = false;
        };
    }

    _handleStateChange(state) {
        const stateName = Photon.LoadBalancing.LoadBalancingClient.StateToName(state);

        // ✅ Chuyển phần Log quan trọng về đây
        const IMPORTANT_STATES = ['ConnectedToMaster', 'Disconnected', 'Error'];
        if (IMPORTANT_STATES.includes(stateName)) {
            console.log(`[Photon Service] State Changed: ${stateName}`);
        }

        switch (state) {
            case Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToMaster:
                this.isConnected = true;
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

    /**
     * TẠO PHÒNG VỚI MUTEX ĐỂ CHỐNG SPAM
     */
    async createRoom(hostId, maxPlayers = 4, roomName = null) {
        // Sử dụng runExclusive để đảm bảo chỉ 1 request được xử lý handler của client tại một thời điểm
        return await this.createRoomMutex.runExclusive(async () => {

            if (!this.isConnected) {
                console.log('[Photon] Connecting...');
                await this.ensureConnected();
            }

            const finalRoomName = roomName || `r${Date.now() % 100000}_${Math.floor(Math.random() * 1000)}`;
            console.log(`[Photon] [Mutex Locked] Creating room: ${finalRoomName}`);

            const originalOnJoinRoom = client.onJoinRoom;
            const originalOnError = client.onError;
            let timeoutId;

            try {
                return await new Promise((resolve, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error(`Create room TIMEOUT (Room: ${finalRoomName})`));
                    }, 15000);

                    client.onJoinRoom = () => {
                        const room = client.myRoom();
                        if (room && room.name === finalRoomName) {
                            console.log(`[Photon] Success! Room created: ${room.name}`);
                            resolve({
                                roomId: room.name,
                                region: PHOTON_REGION,
                                actorNr: client.myActor().actorNr
                            });
                        }
                    };

                    client.onError = (errorCode, errorMsg) => {
                        console.error(`[Photon SDK Error] Code: ${errorCode} | Msg: ${errorMsg}`);
                        reject(new Error(errorMsg || `Photon error code: ${errorCode}`));
                    };

                    const options = {
                        maxPlayers: Number(maxPlayers),
                        isVisible: true,
                        isOpen: true,
                        customRoomProperties: { hostId: hostId, status: 'waiting' },
                        customRoomPropertiesForLobby: ['hostId', 'status'],
                        emptyRoomTtl: 300000,
                        playerTtl: 60000
                    };

                    client.createRoom(finalRoomName, options);
                });
            } catch (error) {
                console.error(`[Photon Service] createRoom failed: ${error.message}`);
                throw error;
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
                // Khôi phục handler về mặc định
                client.onJoinRoom = originalOnJoinRoom;
                client.onError = originalOnError;
                console.log(`[Photon] [Mutex Released] Cleanup for: ${finalRoomName}`);
            }
        });
    }

// Tương tự, joinRoom cũng nên dùng Mutex nếu bạn lo ngại việc ghi đè handler
    async joinRoom(roomId, playerId) {
        return await this.createRoomMutex.runExclusive(async () => {
            if (!this.isConnected) await this.ensureConnected();

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Join timeout')), 10000);

                client.onJoinRoom = () => {
                    clearTimeout(timeout);
                    resolve({ success: true, roomId });
                };

                client.onError = (err) => {
                    clearTimeout(timeout);
                    reject(err);
                };

                client.joinRoom(roomId);
            });
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