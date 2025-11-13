const Photon = require('photon-realtime');

const { PHOTON_APP_ID } = process.env;

// Polyfill WebSocket cho Node.js (vì photon-realtime hỗ trợ ws)
const WebSocket = require('ws');

const client = new Photon.LoadBalancing.LoadBalancingClient(
    Photon.ConnectionProtocol.Wss,  // Wss cho secure
    PHOTON_APP_ID,
    '1.0'  // App version (phải match với client Unity/JS)
);

// Event handlers cơ bản
client.onStateChange = (state) => {
    console.log('Photon state:', Photon.LoadBalancing.LoadBalancingClient.StateToName(state));
};

client.onEvent = (code, data) => {
    console.log('Photon event received:', code, data);
    // Broadcast event đến room members (realtime play)
};

client.onError = (error) => {
    console.error('Photon error:', error);
};

module.exports = { client, Photon };