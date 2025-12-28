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

    async createRoom(hostId, maxPlayers = 4, roomName = null) {
        if (!this.isConnected) {
            console.log('[Photon] Connecting...');
            await this.ensureConnected();
        }

        // 2. Tạo tên phòng ngẫu nhiên nếu không có
        const finalRoomName = roomName || `r${Date.now() % 100000}_${Math.floor(Math.random() * 1000)}`;

        console.log(`[Photon] Attempting to create room: ${finalRoomName}`);

        // Lưu lại handler cũ để khôi phục sau khi xong việc (tránh mất callback hệ thống)
        const originalOnJoinRoom = client.onJoinRoom;
        const originalOnError = client.onError;

        let timeoutId;

        try {
            // Sử dụng Promise để đợi kết quả từ Event của SDK
            return await new Promise((resolve, reject) => {

                // THIẾT LẬP TIMEOUT
                timeoutId = setTimeout(() => {
                    reject(new Error(`Create room TIMEOUT after 15s (Room: ${finalRoomName})`));
                }, 15000);

                // XỬ LÝ KHI JOIN PHÒNG THÀNH CÔNG (Tạo xong sẽ tự Join)
                client.onJoinRoom = () => {
                    const room = client.myRoom();
                    // Kiểm tra xem có đúng phòng mình vừa yêu cầu tạo không
                    if (room && room.name === finalRoomName) {
                        console.log(`[Photon] Success! Room created: ${room.name}`);
                        resolve({
                            roomId: room.name,
                            region: PHOTON_REGION,
                            actorNr: client.myActor().actorNr
                        });
                    }
                };

                // XỬ LÝ KHI SDK BÁO LỖI
                client.onError = (errorCode, errorMsg) => {
                    console.error(`[Photon SDK Error] Code: ${errorCode} | Msg: ${errorMsg}`);
                    reject(new Error(errorMsg || `Photon error code: ${errorCode}`));
                };

                // CẤU HÌNH PHÒNG
                const options = {
                    maxPlayers: Number(maxPlayers),
                    isVisible: true,
                    isOpen: true,
                    customRoomProperties: {
                        hostId: hostId,
                        status: 'waiting'
                    },
                    customRoomPropertiesForLobby: ['hostId', 'status'],
                    emptyRoomTtl: 300000, // Phòng trống tồn tại 5 phút
                    playerTtl: 60000     // Player rớt mạng được giữ chỗ 60s
                };

                // GỌI LỆNH TẠO PHÒNG
                client.createRoom(finalRoomName, options);
            });

        } catch (error) {
            console.error(`[Photon Service] createRoom failed: ${error.message}`);
            throw error; // Ném lỗi ra ngoài để API Controller xử lý (trả về 500)
        } finally {
            // 3. DỌN DẸP (CLEANUP): Luôn chạy dù thành công hay thất bại
            if (timeoutId) clearTimeout(timeoutId);

            // Khôi phục lại các handler cũ hoặc xóa bỏ listener tạm thời
            client.onJoinRoom = originalOnJoinRoom || null;
            client.onError = originalOnError || null;

            console.log(`[Photon] Cleanup listeners for room: ${finalRoomName}`);
        }
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