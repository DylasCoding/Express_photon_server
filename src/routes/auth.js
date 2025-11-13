const express = require('express');
const { guestLogin, register, login } = require('../controllers/authController');
const router = express.Router();

router.post('/guest-login', guestLogin);
router.post('/register', register);
router.post('/login', login);

module.exports = router;