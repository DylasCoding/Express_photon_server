const { client, Photon } = require('../config/photon');

class PhotonService {
    constructor() {
        this.pendingConnect = null;
        this.pendingRoomAction = null;

        client.onStateChange = (state) => this.handleStateChange(state);
    }

    handleStateChange(state) {
        console.log("Photon state:", state);

        if (this.pendingConnect &&
            state === Photon.LoadBalancing.LoadBalancingClient.State.ConnectedToMaster) {
            this.pendingConnect.resolve();
            this.pendingConnect = null;
        }

        if (this.pendingConnect &&
            state === Photon.LoadBalancing.LoadBalancingClient.State.Disconnected) {
            this.pendingConnect.reject(new Error("Photon disconnected"));
            this.pendingConnect = null;
        }

        if (this.pendingRoomAction &&
            state === Photon.LoadBalancing.LoadBalancingClient.State.Joined) {
            this.pendingRoomAction.resolve();
            this.pendingRoomAction = null;
        }
    }

    async ensureConnected() {
        if (client.isConnectedToMaster()) return;

        return new Promise((resolve, reject) => {
            this.pendingConnect = { resolve, reject };
            client.connectToRegionMaster();
        });
    }

    async createRoom(hostId, maxPlayers = 4, roomName = null) {
        await this.ensureConnected();

        if (!roomName) {
            roomName = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }

        return new Promise((resolve, reject) => {
            this.pendingRoomAction = {
                resolve: () => resolve({
                    roomId: client.myRoom().name,
                    actorNr: client.myActor().actorNr
                })
            };

            client.createRoom(roomName, {
                maxPlayers,
                isVisible: true,
                isOpen: true,
                customRoomProperties: { hostId, status: "waiting" }
            });
        });
    }

    async joinRoom(roomId) {
        await this.ensureConnected();

        return new Promise((resolve, reject) => {
            this.pendingRoomAction = {
                resolve: () => resolve({
                    actorNr: client.myActor().actorNr
                })
            };
            client.joinRoom(roomId);
        });
    }
}

module.exports = new PhotonService();
