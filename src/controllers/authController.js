const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebase');
const firestoreService = require('../services/firestoreService');

const login = async (req, res) => {
    console.log(req);
    const { idToken } = req.body;
    try {
        const decoded = await auth.verifyIdToken(idToken);
        const uid = decoded.uid;

        // Tạo JWT cho server
        const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Lưu/lấy profile
        let user = await firestoreService.getUser(uid);
        if (!user) {
            user = { uid, email: decoded.email, level: 1, wins: 0 };
            await firestoreService.saveUser(uid, user);
        }

        res.json({ token, user });
    } catch (err) {
        res.status(401).json({ error: 'Invalid Firebase token' });
    }
};

const register = async (req, res) => {
    console.log("Res"+req.body);
    const { idToken } = req.body;
    try {
        const decoded = await auth.verifyIdToken(idToken);
        const uid = decoded.uid;

        // Tạo JWT cho server
        const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Lưu profile
        const user = { uid, email: decoded.email, level: 1, wins: 0 };
        await firestoreService.saveUser(uid, user);

        res.json({ token, user });
    } catch (err) {
        res.status(401).json({ error: 'Invalid Firebase token' });
    }
}

module.exports = { login, register };