const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
// const gameRoutes = require('./routes/game');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 1. CORS FULL
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 2. XỬ LÝ OPTIONS PREFlight CHO TẤT CẢ ROUTE – KHÔNG DÙNG app.options('*')!
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.header('Access-Control-Max-Age', '86400');
        console.log('OPTIONS Preflight OK:', req.originalUrl);
        return res.sendStatus(200);
    }
    next();
});

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// 4. Health check
app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running!', time: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/room', roomRoutes);
// app.use('/api/game', gameRoutes);

// 6. 404
app.use('/', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

module.exports = app;