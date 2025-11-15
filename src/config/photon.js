// src/config/photon.js
const Photon = require('photon-realtime');
require('ws');

const PHOTON_APP_ID = process.env.PHOTON_APP_ID;
const PHOTON_REGION = process.env.PHOTON_REGION;

console.log("Photon region:", PHOTON_REGION);

const client = new Photon.LoadBalancing.LoadBalancingClient(
    Photon.ConnectionProtocol.Ws,
    PHOTON_APP_ID,
    '1.0'
);

// ✅ TẮT LOG SDK - DÙNG client.logger
client.logger.level = 'error';  // Chỉ log error
// hoặc
// client.logger.level = 'warn'; // log warn + error

// ✅ CHỈ LOG TRẠNG THÁI QUAN TRỌNG
const IMPORTANT_STATES = [
    'ConnectedToMaster',
    'Disconnected',
    'Error'
];

client.onStateChange = (state) => {
    const name = Photon.LoadBalancing.LoadBalancingClient.StateToName(state);
    if (IMPORTANT_STATES.includes(name)) {
        console.log(`[Photon] State: ${name}`);
    }
};

client.onError = (err) => {
    console.error(`[Photon] ERROR: ${err}`);
};

module.exports = { client, Photon, PHOTON_REGION };