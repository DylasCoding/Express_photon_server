// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 1. Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const uid = decoded.uid;

        // 2. Lấy user từ Firestore (không dùng Firebase Auth)
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(401).json({ error: 'User not found' });
        }

        // 3. Gắn user vào request
        req.user = {
            uid: uid,
            ...userDoc.data()
        };

        next();
    } catch (err) {
        console.error('JWT Error:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { protect };