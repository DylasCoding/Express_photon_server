const express = require('express');
const { createRoom, joinRoom } = require('../controllers/roomController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/create', protect, createRoom);
router.post('/join/:roomId', protect, joinRoom);

module.exports = router;