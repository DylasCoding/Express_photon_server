// src/services/photonService.js
const { client, Photon } = require('../config/photon');

class PhotonService {
    async ensureConnected() {
        if (client.isConnectedToMaster) return;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Photon connect timeout')), 10000);

            const onStateChange = (state) => {
                if (state === Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToMaster) {
                    clearTimeout(timeout);
                    client.removeOnStateChange(onStateChange); // Gỡ listener
                    resolve();
                } else if (state === Photon.LoadBalancing.LoadBalancingClient.State.Disconnected) {
                    clearTimeout(timeout);
                    client.removeOnStateChange(onStateChange);
                    reject(new Error('Photon disconnected'));
                }
            };

            client.addOnStateChange(onStateChange);
            client.connectToRegionMaster(); // Tự động connect
        });
    }

    async createRoom(hostId, maxPlayers = 4, roomName = null) {
        await this.ensureConnected();

        if (!roomName) {
            roomName = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }

        return new Promise((resolve, reject) => {
            const onStateChange = (state) => {
                if (state === Photon.LoadBalancing.LoadBalancingClient.State.Joined) {
                    client.removeOnStateChange(onStateChange);
                    resolve({
                        roomId: client.myRoom().name,
                        actorNr: client.myActor().actorNr
                    });
                }
            };

            client.addOnStateChange(onStateChange);
            client.createRoom(roomName, {
                maxPlayers,
                isVisible: true,
                isOpen: true,
                customRoomProperties: { hostId, status: 'waiting' }
            });
        });
    }

    async joinRoom(roomId, playerId) {
        await this.ensureConnected();

        return new Promise((resolve, reject) => {
            const onStateChange = (state) => {
                if (state === Photon.LoadBalancing.LoadBalancingClient.State.Joined) {
                    client.removeOnStateChange(onStateChange);
                    resolve({
                        success: true,
                        actorNr: client.myActor().actorNr
                    });
                }
            };

            client.addOnStateChange(onStateChange);
            client.joinRoom(roomId);
        });
    }

    async leaveRoom() {
        if (client.myRoom()) {
            client.leaveRoom();
        }
    }

    // Gửi event realtime (move, shoot,...)
    raiseEvent(code, data) {
        if (client.myRoom()) {
            client.raiseEvent(code, data, {
                receivers: Photon.LoadBalancing.Constants.ReceiverGroup.All
            });
        }
    }
}

module.exports = new PhotonService();