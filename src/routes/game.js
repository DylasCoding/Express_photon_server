const express = require('express');
const { updateCharacter } = require('../controllers/gameController');
const { protect } = require('../middleware/auth');
const router = express.Router();


router.post('/update-character', protect, updateCharacter);


module.exports = router;