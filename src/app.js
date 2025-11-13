const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
// const gameRoutes = require('./routes/game');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({
    origin: true, // Cho phép mọi origin (hoặc ['https://your-game.render.com', 'http://localhost:3000'])
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/room', roomRoutes);
// app.use('/api/game', gameRoutes);

app.use(errorHandler);

module.exports = app;