const express = require('express');

const controller = require('../controllers/gameController');
const middleware = require('../middleware/auth');

// support named exports or default/commonjs export
const startGame = controller.startGame || controller.default || controller;
const getGameState = controller.getGameState || controller.default || controller;
const protect = middleware.protect || middleware.default || middleware;

if (typeof protect !== 'function' || typeof startGame !== 'function' || typeof getGameState !== 'function') {
    throw new TypeError(
        'Route handlers must be functions. Check exports in `../controllers/gameController` and `../middleware/auth`.'
    );
}

const router = express.Router();

router.post('/start/:roomId', protect, startGame);
router.get('/state/:gameId', protect, getGameState);

module.exports = router;