// src/config/photon.js
const Photon = require('photon-realtime');
const { PHOTON_APP_ID, PHOTON_REGION } = process.env;

// Polyfill WebSocket cho Node.js
global.WebSocket = require('ws');

const client = new Photon.LoadBalancing.LoadBalancingClient(
    Photon.ConnectionProtocol.Wss,
    PHOTON_APP_ID,
    '1.0' // Phải trùng với client Unity/JS
);

// Event handlers (sẽ dùng trong service)
client.onStateChange = (state) => {
    console.log('Photon State:', Photon.LoadBalancing.LoadBalancingClient.StateToName(state));
};

client.onEvent = (code, content, actorNr) => {
    console.log('Photon Event:', { code, content, actorNr });
};

client.onError = (err) => {
    console.error('Photon Error:', err);
};

module.exports = { client, Photon };