const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebase');

const{ JWT_SECRET } = process.env;


const protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userRecord = await auth.getUser(decoded.uid);
        req.user = { uid: userRecord.uid, email: userRecord.email };
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { protect };