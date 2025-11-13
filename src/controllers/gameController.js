const firestoreService = require('../services/firestoreService');

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

const startGame = async (req, res) => {
    const { roomId, scores, winnerId } = req.body;
    try {
        const test1= 1;
        res.status(200).json({ success: true });
    }catch (err){
        res.status(500).json({ error: err.message });
    }

}

const getGameState = async (req, res) => {
    const { roomId } = req.params;
    try {
        const gameState = 222;
        res.status(200).json(gameState);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { endGame };