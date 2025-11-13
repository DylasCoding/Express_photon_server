const { client, Photon } = require('../config/photon');

const PHOTON_REGION = process.env.PHOTON_REGION;

class PhotonService {
    async connect() {
        if (client.isConnected) return;
        return new Promise((resolve, reject) => {
            client.setOnLoad(() => {
                client.connectToRegionMaster(PHOTON_REGION);
            });
            client.onStateChange = (state) => {
                if (state === Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToMaster) {
                    resolve();
                } else if (state === Photon.LoadBalancing.LoadBalancingClient.State.Disconnect) {
                    reject(new Error('Disconnected from Photon'));
                }
            };
        });
    }

    async createRoom(hostId, maxPlayers = 4, roomName = 'default-room') {
        await this.connect();
        return new Promise((resolve, reject) => {
            client.onStateChange = (state) => {
                if (state === Photon.LoadBalancing.LoadBalancingClient.State.JoinedLobby) {
                    client.joinRoom(roomName, {
                        createIfNotExists: true,
                        maxPlayers,
                        customRoomProperties: { hostId, status: 'waiting' }
                    });
                } else if (state === Photon.LoadBalancing.LoadBalancingClient.State.Joined) {
                    resolve({ roomId: roomName, actorNr: client.myRoom().actorNumber });
                }
            };
            client.onError = reject;
        });
    }

    async joinRoom(roomId, playerId) {
        await this.connect();
        return new Promise((resolve, reject) => {
            client.joinRoom(roomId);
            client.onStateChange = (state) => {
                if (state === Photon.LoadBalancing.LoadBalancingClient.State.Joined) {
                    resolve({ success: true, actorNr: client.myRoom().actorNumber });
                }
            };
            client.onError = reject;
        });
    }

    async leaveRoom(roomId) {
        client.leaveRoom();
    }

    // Gửi event realtime (ví dụ: player move trong play)
    sendEvent(eventCode, data, roomId) {
        if (client.myRoom().name === roomId) {
            client.raiseEvent(
                eventCode,  // Ví dụ: 1 = move, 2 = shoot
                data,       // { x: 10, y: 20, playerId }
                { receivers: Photon.LoadBalancing.Constants.ReceiverGroup.All }  // Gửi cho tất cả trong room
            );
        }
    }
}

module.exports = new PhotonService();