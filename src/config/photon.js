const Photon = require('photon-realtime');
global.WebSocket = require('ws'); // Bắt buộc cho Node.js

const PHOTON_APP_ID = process.env.PHOTON_APP_ID;
const PHOTON_REGION = process.env.PHOTON_REGION || 'asia';

const client = new Photon.LoadBalancing.LoadBalancingClient(
    Photon.ConnectionProtocol.Wss,
    PHOTON_APP_ID,
    '1.0'
);

// Chỉ để lại mức Log để tránh spam console
client.logger.level = 'error';

module.exports = { client, Photon, PHOTON_REGION };