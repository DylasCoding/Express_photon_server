const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid'); // npm install uuid

// 1. Guest Login
const guestLogin = async (req, res) => {
    try {
        const guestId = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const username = `Guest${Math.floor(Math.random() * 9999)}`;

        const userRef = db.collection('users').doc(guestId);
        const userData = {
            uid: guestId,
            username,
            level: 1,
            wins: 0,
            isGuest: true,
            createdAt: new Date()
        };

        await userRef.set(userData);

        const token = jwt.sign({ uid: guestId }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: userData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Register
const register = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        // Kiểm tra username tồn tại
        const snapshot = await db.collection('users').where('username', '==', username).get();
        if (!snapshot.empty) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const uid = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);

        const userRef = db.collection('users').doc(uid);
        const userData = {
            uid,
            username,
            passwordHash,
            character: 1,
            level: 1,
            wins: 0,
            isGuest: false,
            createdAt: new Date()
        };

        await userRef.set(userData);

        const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { uid, username, level: 1, wins: 0 }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Login
const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const snapshot = await db.collection('users').where('username', '==', username).get();
        if (snapshot.empty) {
            return res.status(401).json({ error: 'User not found' });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const uid = userDoc.id;

        const isValid = await bcrypt.compare(password, userData.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Wrong password' });
        }

        // ⭐ AUTO PATCH: Thêm field mới nếu chưa có
        const newFields = {};
        if (userData.character === undefined) newFields.character = 1;

        // Nếu có field cần update -> update trong DB
        if (Object.keys(newFields).length > 0) {
            await db.collection('users').doc(uid).update(newFields);
        }

        const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { uid, username: userData.username, level: userData.level, wins: userData.wins }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { guestLogin, register, login };