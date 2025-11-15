// src/routes/room.js
const express = require('express');
const { createRoom, joinRoom, listRooms,searchRoomByCode } = require('../controllers/roomController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/create', protect, createRoom);
router.post('/join/:roomId', protect, joinRoom);
router.post('/search', protect, searchRoomByCode); // Thêm search room by join code
router.get('/list', protect, listRooms); // Thêm list rooms

module.exports = router;