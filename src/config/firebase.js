const dotenv = require('dotenv');
dotenv.config();

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const { FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT } = process.env;

function parseServiceAccount(raw) {
    if (!raw) return null;
    // Try plain JSON
    try { return JSON.parse(raw); } catch (e) {}
    // Try base64 decode then parse
    try {
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        return JSON.parse(decoded);
    } catch (e) {}
    // Try fixing escaped newlines
    try {
        const fixed = raw.replace(/\\n/g, '\n');
        return JSON.parse(fixed);
    } catch (e) {}
    throw new Error('`FIREBASE_SERVICE_ACCOUNT` is not valid JSON (tried raw, base64, and \\n fixes).');
}

let serviceAccount = null;

// 1) Prefer full JSON in env var `FIREBASE_SERVICE_ACCOUNT`
if (FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = parseServiceAccount(FIREBASE_SERVICE_ACCOUNT);
    if (serviceAccount && serviceAccount.private_key && serviceAccount.private_key.includes('\\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
}

// 2) Build from individual env vars if provided
if (!serviceAccount) {
    const {
        FIREBASE_PROJECT_TYPE,
        FIREBASE_PRIVATE_KEY_ID,
        FIREBASE_PRIVATE_KEY,
        FIREBASE_CLIENT_EMAIL,
        FIREBASE_CLIENT_ID,
        FIREBASE_AUTH_URI,
        FIREBASE_TOKEN_URI,
        FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        FIREBASE_CLIENT_X509_CERT_URL,
        FIREBASE_UNIVERSE_DOMAIN
    } = process.env;

    if (FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
            type: FIREBASE_PROJECT_TYPE,
            project_id: FIREBASE_PROJECT_ID,
            private_key_id: FIREBASE_PRIVATE_KEY_ID,
            private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: FIREBASE_CLIENT_EMAIL,
            client_id: FIREBASE_CLIENT_ID,
            auth_uri: FIREBASE_AUTH_URI,
            token_uri: FIREBASE_TOKEN_URI,
            auth_provider_x509_cert_url: FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: FIREBASE_CLIENT_X509_CERT_URL,
            universe_domain: FIREBASE_UNIVERSE_DOMAIN
        };
    }
}

// 3) Fallback to local file
if (!serviceAccount) {
    try {
        const p = path.join(__dirname, '../../firebase-service-account.json');
        if (fs.existsSync(p)) serviceAccount = require(p);
    } catch (e) { /* ignore */ }
}

if (!serviceAccount) {
    throw new Error('Firebase service account not found. Set `FIREBASE_SERVICE_ACCOUNT`, provide individual FIREBASE_ env vars, or add `firebase-service-account.json` at project root.');
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: FIREBASE_PROJECT_ID,
    databaseURL: `https://${FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };