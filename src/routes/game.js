const express = require('express');
const { updateCharacter, updateWinStreak, getTopWinStreaks } = require('../controllers/gameController');
const { protect } = require('../middleware/auth');
const router = express.Router();


router.post('/update-character', protect, updateCharacter);
router.post('/update-win-streak', protect, updateWinStreak);
router.get('/top-win-streaks', protect, getTopWinStreaks);


module.exports = router;