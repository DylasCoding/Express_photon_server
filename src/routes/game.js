const express = require('express');
const { updateCharacter, updateWinStreak, getTopWinStreaks } = require('../controllers/gameController');
const { protect } = require('../middleware/auth');
const router = express.Router();


//Character
router.post('/update-character', protect, updateCharacter);

//Win streak
router.post('/update-win-streak', protect, updateWinStreak);
router.get('/top-win-streaks', protect, getTopWinStreaks);


module.exports = router;