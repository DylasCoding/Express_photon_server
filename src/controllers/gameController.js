const firestoreService = require('../services/firestoreService');
const { db } = require('../config/firebase');


const endGame = async (req, res) => {
    const { roomId, scores, winnerId } = req.body;

    try {
        await firestoreService.saveGameResult({
            roomId,
            scores,
            winnerId,
            endedAt: new Date()
        });

        // Cập nhật stats người chơi
        for (const [uid, score] of Object.entries(scores)) {
            await firestoreService.saveUser(uid, {
                totalScore: admin.firestore.FieldValue.increment(score),
                wins: uid === winnerId ? admin.firestore.FieldValue.increment(1) : 0
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateWinStreak = async (req, res) => {
    const { uid, winStreak } = req.body;

    try {
        const userDoc = await db.collection('WinStreaks').doc(uid).get();

        if (userDoc.exists) {
            const currentWinStreak = userDoc.data().winStreak;

            // Chỉ cập nhật nếu winStreak mới lớn hơn winStreak hiện tại
            if (winStreak > currentWinStreak) {
                await db.collection('WinStreaks').doc(uid).update({ winStreak });
                return res.status(200).json({ success: true, message: 'WinStreak updated successfully.' });
            } else {
                return res.status(200).json({ success: false, message: 'New WinStreak is not greater than the current one.' });
            }
        } else {
            // Tạo mới nếu chưa có winStreak
            await db.collection('WinStreaks').doc(uid).set({ uid, winStreak });
            return res.status(201).json({ success: true, message: 'WinStreak created successfully.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};



const getTopWinStreaks = async (req, res) => {
    try {
        // Lấy 10 người có WinStreak cao nhất
        const snapshot = await db.collection('WinStreaks')
            .orderBy('winStreak', 'desc')
            .limit(10)
            .get();

        const leaderboard = [];

        for (const doc of snapshot.docs) {
            const { uid, winStreak } = doc.data();

            // Đối chiếu uid với username từ collection users
            const userDoc = await db.collection('users').doc(uid).get();
            const username = userDoc.exists ? userDoc.data().username : 'Unknown';

            leaderboard.push({ uid, username, winStreak });
        }

        res.status(200).json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const updateCharacter = async (req, res) => {
    const { uid, character } = req.body;
    try {
        await firestoreService.saveUser(uid, { character });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { endGame, updateCharacter,updateWinStreak,getTopWinStreaks };