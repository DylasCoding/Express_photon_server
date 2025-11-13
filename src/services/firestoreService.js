const { db } = require('../config/firebase');

class FirestoreService {
    async saveUser(uid, data) {
        await db.collection('users').doc(uid).set(data, { merge: true });
    }

    async getUser(uid) {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    }

    async saveGameResult(gameData) {
        await db.collection('games').add({
            ...gameData,
            timestamp: new Date()
        });
    }
}

module.exports = new FirestoreService();