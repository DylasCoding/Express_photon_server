// src/config/photon.js
const Photon = require('photon-realtime');
require('ws'); // Polyfill WebSocket

const PHOTON_APP_ID = process.env.PHOTON_APP_ID;
const PHOTON_REGION = process.env.PHOTON_REGION;

const client = new Photon.LoadBalancing.LoadBalancingClient(
    Photon.ConnectionProtocol.Ws, // Dùng Ws thay Wss để tránh SSL issue
    PHOTON_APP_ID,
    '1.0'
);

module.exports = { client, Photon, PHOTON_REGION };